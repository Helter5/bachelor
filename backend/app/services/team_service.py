"""
Team Service
Business logic for team operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain import Team, TeamBase, SportEvent
from .base_service import BaseService
from .arena import fetch_arena_data, fetch_all_arena_items

logger = logging.getLogger(__name__)


class TeamService(BaseService[Team]):
    """Service for team operations"""

    def __init__(self, session: Session):
        super().__init__(session, Team)

    async def get_teams_from_arena(self, sport_event_id: str) -> Dict[str, Any]:
        """Fetch teams for a sport event from Arena API."""
        return await fetch_arena_data(f"team/{sport_event_id}")

    def get_teams_by_event(self, sport_event_id: int) -> List[Team]:
        """Get all teams for a sport event from database."""
        return list(self.session.exec(select(Team).where(Team.sport_event_id == sport_event_id)).all())

    async def sync_teams_for_event(
        self,
        sport_event_uuid: str,
        event_id: int,
        source: Optional["ArenaSource"] = None,
    ) -> Dict[str, Any]:
        """Sync teams for a sport event from Arena API to database."""
        async def _do_sync(uuid: str, event_db_id: int) -> Optional[Dict[str, int]]:
            try:
                teams_list = await fetch_all_arena_items(
                    f"team/{uuid}", "sportEventTeams", source=source
                )
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No teams found for event {uuid}")
                    return None
                raise

            if not teams_list:
                logger.warning(f"No teams data in response for event {uuid}")
                return None

            return self._sync_teams_list(teams_list, event_db_id, source=source)

        return await self._run_arena_sync_for_event(event_id, sport_event_uuid, "teams", _do_sync)

    def _extract_teams_list(self, teams_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract teams list from Arena API response."""
        if "sportEventTeams" in teams_data and "items" in teams_data["sportEventTeams"]:
            return teams_data["sportEventTeams"]["items"]
        elif "teams" in teams_data:
            return teams_data["teams"]
        return []

    def _sync_teams_list(
        self,
        teams_list: List[Dict[str, Any]],
        event_db_id: int,
        source: Optional["ArenaSource"] = None,
    ) -> Dict[str, int]:
        """
        Sync a list of teams to the database.
        Matches by natural key (sport_event_id, name). Arena UUIDs stored in TeamSourceUid.
        """
        created = 0
        updated = 0

        for team_data in teams_list:
            try:
                team_create = TeamBase(
                    sport_event_id=event_db_id,
                    name=team_data.get("name", ""),
                    alternate_name=team_data.get("alternateName"),
                    athlete_count=team_data.get("athleteCount"),
                    final_rank=team_data.get("finalRank"),
                    country_iso_code=team_data.get("countryIsoCode"),
                )

                existing_team = self.session.exec(
                    select(Team).where(
                        Team.sport_event_id == event_db_id,
                        Team.name == team_create.name,
                    )
                ).first()

                # Fallback: different Arena sources may name the same country differently
                # (e.g. source A: name="GERMANY" vs source B: name="GER")
                if not existing_team and team_create.name:
                    existing_team = self.session.exec(
                        select(Team).where(
                            Team.sport_event_id == event_db_id,
                            Team.alternate_name == team_create.name,
                        )
                    ).first()
                    if existing_team:
                        team_create.name = existing_team.name
                        if existing_team.country_iso_code and not team_create.country_iso_code:
                            team_create.country_iso_code = existing_team.country_iso_code

                if existing_team:
                    new_data = team_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_team, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_team, key, value)
                        existing_team.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_team)
                        updated += 1
                        logger.info(f"Updated team: {existing_team.name}")
                else:
                    new_team = Team(**team_create.model_dump())
                    self.session.add(new_team)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new team: {team_create.name}")

            except Exception as e:
                logger.error(f"Failed to sync team {team_data.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}
