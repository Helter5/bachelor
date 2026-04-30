"""Referee synchronization service.

Arena API reference: https://arena.uww.org/api/doc/
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from datetime import datetime
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain.entities.referee import Referee
from ..domain.entities.team import Team
from ..domain.entities.sport_event import SportEvent
from ..utils.country_codes import normalize_country_iso_code
from .base_service import BaseService
from .arena import fetch_all_arena_items
from .sync_identity import resolve_person_id

logger = logging.getLogger(__name__)


class RefereeService(BaseService[Referee]):
    """Service for referee operations"""

    def __init__(self, session: Session):
        super().__init__(session, Referee)

    async def sync_referees_for_event(
        self,
        sport_event_uuid: str,
        event_id: int,
        source: Optional["ArenaSource"] = None
    ) -> Dict[str, Any]:
        """
        Sync referees for a sport event from Arena API to database

        Args:
            sport_event_uuid: Sport event UUID from Arena API
            event_id: Local database ID of the sport event
            source: Arena source to sync from

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

            logger.info(f"Syncing referees for event: {event.name}")

            # Fetch all referees from Arena API
            try:
                referees_list = await fetch_all_arena_items(
                    f"referee/{sport_event_uuid}",
                    "referees",
                    source=source
                )
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No referees found for event {sport_event_uuid}")
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "message": "No referees available for this event"
                    }
                raise

            if not referees_list:
                logger.warning(f"No referees data in response for event {sport_event_uuid}")
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "message": "No referees data in response"
                }

            # Build in-memory maps for FK resolution
            team_by_alt_name, team_by_name = self._build_team_maps(event.id)

            result = self._sync_referees_list(
                referees_list,
                event.id,
                team_by_alt_name,
                team_by_name
            )

            self.session.commit()
            logger.info(
                f"Referees for {event.name}: {result['created']} created, {result['updated']} updated"
            )

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
            logger.error(f"Failed to sync referees for event {sport_event_uuid}: {str(e)}", exc_info=True)
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync referees: {str(e)}")

    def _build_team_maps(self, event_db_id: int) -> tuple:
        """Build team lookup maps by alternate_name and name"""
        teams = self.session.exec(
            select(Team).where(Team.sport_event_id == event_db_id)
        ).all()

        team_by_alt_name = {t.alternate_name: t.id for t in teams if t.alternate_name}
        team_by_name = {t.name: t.id for t in teams}

        return team_by_alt_name, team_by_name

    def _resolve_person(
        self,
        first_name: str,
        last_name: str,
        country_iso_code: Optional[str]
    ) -> Optional[int]:
        """
        Find or create a Person record for the given name + country.
        Returns the person.id or None if no name provided.
        """
        return resolve_person_id(
            self.session,
            first_name=first_name,
            last_name=last_name,
            country_iso_code=country_iso_code,
            logger=logger,
        )

    def _sync_referees_list(
        self,
        referees_list: List[Dict[str, Any]],
        event_db_id: int,
        team_by_alt_name: Dict[str, int],
        team_by_name: Dict[str, int]
    ) -> Dict[str, int]:
        """
        Sync a list of referees to the database.

        Args:
            referees_list: List of referee data from Arena API
            event_db_id: Sport event database ID
            team_by_alt_name: {team.alternate_name: team.id}
            team_by_name: {team.name: team.id}

        Returns:
            Dict with created/updated counts
        """
        created = 0
        updated = 0

        for referee_data in referees_list:
            try:
                # Parse full name into first and last name
                full_name = (referee_data.get("fullName") or "").strip()
                parts = full_name.split()

                if len(parts) >= 2:
                    first_name = parts[0]
                    last_name = " ".join(parts[1:])
                elif len(parts) == 1:
                    first_name = parts[0]
                    last_name = ""
                else:
                    first_name = ""
                    last_name = ""

                # Get country from origins
                origins = referee_data.get("origins") or []
                country_iso_code = normalize_country_iso_code(origins[0] if origins else None)

                # Resolve person
                person_id = self._resolve_person(first_name, last_name, country_iso_code)

                # Resolve team
                team_id = None
                team_alt_name = referee_data.get("teamAlternateName")
                team_name = referee_data.get("teamName")

                if team_alt_name and team_alt_name in team_by_alt_name:
                    team_id = team_by_alt_name[team_alt_name]
                elif team_name and team_name in team_by_name:
                    team_id = team_by_name[team_name]

                # Match by natural key (sport_event + person)
                existing_referee = self.session.exec(
                    select(Referee).where(
                        Referee.sport_event_id == event_db_id,
                        Referee.person_id == person_id,
                    )
                ).first() if person_id else None

                referee_data_clean = {
                    "sport_event_id": event_db_id,
                    "person_id": person_id,
                    "team_id": team_id,
                    "number": referee_data.get("number"),
                    "referee_level": referee_data.get("refereeLevel"),
                    "referee_group": referee_data.get("refereeGroup"),
                    "delegate": referee_data.get("delegate", False),
                    "matchairman": referee_data.get("matchairman", False),
                    "is_referee": referee_data.get("referee", False),
                    "preferred_style": referee_data.get("preferedStyle"),
                    "mat_name": referee_data.get("matName"),
                    "deactivated": referee_data.get("deactivated", False),
                    "sync_timestamp": datetime.utcnow(),
                }

                if existing_referee:
                    if self.has_changes(existing_referee, referee_data_clean):
                        for key, value in referee_data_clean.items():
                            setattr(existing_referee, key, value)
                        self.session.add(existing_referee)
                        updated += 1
                        logger.info(f"Updated referee id={existing_referee.id}")
                else:
                    new_referee = Referee(**referee_data_clean)
                    self.session.add(new_referee)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new referee id={new_referee.id}")

            except Exception as e:
                logger.error(
                    f"Failed to sync referee {referee_data.get('id')}: {str(e)}",
                    exc_info=True
                )
                continue

        return {"created": created, "updated": updated}
