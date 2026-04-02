"""
Team Service
Business logic for team operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain import Team, TeamBase, SportEvent
from .base_service import BaseService
from .arena import fetch_arena_data

logger = logging.getLogger(__name__)


class TeamService(BaseService[Team]):
    """Service for team operations"""

    def __init__(self, session: Session):
        super().__init__(session, Team)

    async def get_teams_from_arena(self, sport_event_id: str) -> Dict[str, Any]:
        """
        Fetch teams for a sport event from Arena API

        Args:
            sport_event_id: Sport event UUID

        Returns:
            Arena API response with teams
        """
        return await fetch_arena_data(f"team/{sport_event_id}")

    def get_teams_by_event(self, sport_event_id: int) -> List[Team]:
        """
        Get all teams for a sport event from database

        Args:
            sport_event_id: Sport event database ID

        Returns:
            List of teams
        """
        statement = select(Team).where(Team.sport_event_id == sport_event_id)
        return list(self.session.exec(statement).all())

    async def sync_teams_for_event(self, sport_event_uuid: str, event_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """
        Sync teams for a sport event from Arena API to database

        Args:
            sport_event_uuid: Sport event UUID from Arena API (used for API call)
            event_id: Local database ID of the sport event

        Returns:
            Dict with sync results

        Raises:
            HTTPException: If event not found or sync fails
        """
        try:
            event = self.session.exec(
                select(SportEvent).where(SportEvent.id == event_id)
            ).first()

            if not event:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sport event {event_id} not found"
                )

            logger.info(f"Syncing teams for event: {event.name}")

            # Fetch teams from Arena API
            try:
                teams_data = await fetch_arena_data(f"team/{sport_event_uuid}", source=source)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No teams found for event {sport_event_uuid}")
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "message": "No teams available for this event"
                    }
                raise

            # Extract teams list from Arena API response
            teams_list = self._extract_teams_list(teams_data)

            if not teams_list:
                logger.warning(f"No teams data in response for event {sport_event_uuid}")
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "message": "No teams data in response"
                }

            # Sync each team
            result = self._sync_teams_list(teams_list, event.id)

            self.session.commit()
            logger.info(f"Teams for {event.name}: {result['created']} created, {result['updated']} updated")

            return {
                "success": True,
                "event_id": sport_event_uuid,
                "event_name": event.name,
                "synced_count": result["created"] + result["updated"],
                "created": result["created"],
                "updated": result["updated"]
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to sync teams for event {sport_event_uuid}: {str(e)}", exc_info=True)
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync teams: {str(e)}")

    def _extract_teams_list(self, teams_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract teams list from Arena API response

        Args:
            teams_data: Arena API response

        Returns:
            List of team dictionaries
        """
        if "sportEventTeams" in teams_data and "items" in teams_data["sportEventTeams"]:
            return teams_data["sportEventTeams"]["items"]
        elif "teams" in teams_data:
            return teams_data["teams"]
        return []

    def _sync_teams_list(self, teams_list: List[Dict[str, Any]], event_db_id: int) -> Dict[str, int]:
        """
        Sync a list of teams to the database

        Args:
            teams_list: List of team data from Arena API
            event_db_id: Sport event database ID

        Returns:
            Dict with created and updated counts
        """
        created = 0
        updated = 0

        for team_data in teams_list:
            try:
                # Map Arena API fields to database fields
                team_create = TeamBase(
                    uid=UUID(team_data["id"]),
                    sport_event_id=event_db_id,
                    name=team_data.get("name", ""),
                    alternate_name=team_data.get("alternateName"),
                    athlete_count=team_data.get("athleteCount"),
                    final_rank=team_data.get("finalRank"),
                    country_iso_code=team_data.get("countryIsoCode"),
                )

                # Check if team already exists by natural key (sport_event + name)
                existing_team = self.session.exec(
                    select(Team).where(
                        Team.sport_event_id == event_db_id,
                        Team.name == team_create.name,
                    )
                ).first()

                if existing_team:
                    new_data = team_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_team, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_team, key, value)
                        existing_team.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_team)
                        updated += 1
                        logger.info(f"Updated team: {team_create.uid}")
                else:
                    # Create new team
                    new_team = Team(**team_create.model_dump())
                    self.session.add(new_team)
                    created += 1
                    logger.info(f"Created new team: {team_create.uid}")

            except Exception as e:
                logger.error(f"Failed to sync team {team_data.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}

