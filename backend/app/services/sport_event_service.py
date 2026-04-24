"""
Sport Event Service
Business logic for sport event operations
"""
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource
from uuid import UUID
from datetime import datetime, timezone
import logging

from ..domain import SportEvent, SportEventBase
from ..infrastructure.arena_gateway import ArenaGateway
from .base_service import BaseService
from .arena import fetch_arena_data

logger = logging.getLogger(__name__)


class SportEventService(BaseService[SportEvent]):
    """Service for sport event operations"""

    def __init__(self, session: Session):
        super().__init__(session, SportEvent)

    def get_all_from_database(self) -> List[Dict[str, Any]]:
        """
        Get all sport events from local database

        Returns:
            List of sport events with formatted data
        """
        events = self.get_all()
        return [
            {
                "id": event.id,
                "name": event.name,
                "start_date": event.start_date,
                "end_date": event.end_date,
                "country_iso_code": event.country_iso_code,
                "address_locality": event.address_locality,
                "continent": event.continent,
                "tournament_type": event.tournament_type,
                "event_type": event.event_type,
                "is_individual_event": event.is_individual_event,
                "is_team_event": event.is_team_event,
                "created_at": event.created_at.isoformat() if event.created_at else None,
                "updated_at": event.updated_at.isoformat() if event.updated_at else None,
            }
            for event in events
        ]

    async def get_all_from_arena(self) -> Dict[str, Any]:
        """
        Fetch all sport events from Arena API (using default settings)

        Returns:
            Arena API response with sport events
        """
        return await fetch_arena_data("sport-event/")

    async def get_all_from_arena_source(self, source) -> Dict[str, Any]:
        """
        Fetch all sport events from a specific Arena source

        Args:
            source: ArenaSource entity with connection details

        Returns:
            Arena API response with sport events
        """
        return await ArenaGateway(source).fetch_data("sport-event/", source=source)

    async def get_details_from_arena(self, event_id: str) -> Dict[str, Any]:
        """
        Fetch sport event details from Arena API

        Args:
            event_id: Sport event UUID

        Returns:
            Arena API response with event details
        """
        return await fetch_arena_data(f"sport-event/get/{event_id}")

    async def get_sessions_from_arena(self, event_id: str) -> Dict[str, Any]:
        """
        Fetch sessions for a sport event from Arena API

        Args:
            event_id: Sport event UUID

        Returns:
            Arena API response with sessions
        """
        return await fetch_arena_data(f"session/{event_id}")

    def get_by_natural_key(self, name: str, country_iso_code: str) -> Optional[SportEvent]:
        """
        Get sport event by natural key (name, country_iso_code)

        Args:
            name: Event name
            country_iso_code: Country ISO code

        Returns:
            SportEvent if found, None otherwise
        """
        statement = select(SportEvent).where(
            SportEvent.name == name,
            SportEvent.country_iso_code == country_iso_code
        )
        return self.session.exec(statement).first()

    async def sync_event(self, event_data: SportEventBase) -> Dict[str, Any]:
        """
        Sync sport event from Arena to database using natural key matching.

        Matches events by (name, start_date, country_iso_code) to handle
        distributed Arena instances with different UUIDs for the same event.
        UUIDs are ephemeral — resolved at sync-time from the Arena source, never stored.

        Args:
            event_data: Sport event data to sync

        Returns:
            Dict with sync result
        """
        try:
            existing_event = self.get_by_natural_key(
                event_data.name,
                event_data.country_iso_code or ""
            )

            if existing_event:
                new_data = event_data.model_dump(exclude_unset=True)
                changes = self.has_changes(existing_event, new_data)

                if changes:
                    for key, value in new_data.items():
                        setattr(existing_event, key, value)
                    existing_event.updated_at = datetime.now(timezone.utc)
                    self.session.commit()
                    self.session.refresh(existing_event)
                    logger.info(f"Updated sport event: {existing_event.name}")
                    matched_by = "updated"
                else:
                    logger.debug(f"No changes for sport event: {existing_event.name}")
                    matched_by = "unchanged"

                event = existing_event
            else:
                new_event = SportEvent(**event_data.model_dump())
                self.session.add(new_event)
                self.session.commit()
                self.session.refresh(new_event)

                logger.info(f"Created new sport event: {new_event.name}")
                matched_by = "new"
                event = new_event

            return {
                "success": True,
                "id": event.id,
                "name": event.name,
                "message": "Event updated successfully" if matched_by == "updated" else ("Event created successfully" if matched_by == "new" else "No changes"),
                "matched_by": matched_by
            }

        except Exception as e:
            self.session.rollback()
            logger.error(f"Error syncing sport event: {str(e)}")
            raise

    async def get_start_list(self, event_id: str) -> Dict[str, Any]:
        """
        Fetch start list for a sport event from Arena API and return filtered useful data

        Args:
            event_id: Sport event UUID

        Returns:
            Filtered start list data with only useful information
        """
        # Fetch full data from Arena API
        data = await fetch_arena_data(f"sport-event/get/{event_id}/start-list")
        
        sport_event = data.get("sportEvent", {})
        
        # Extract useful information
        filtered_data = {
            "event_info": {
                "id": sport_event.get("id"),
                "name": sport_event.get("name"),
                "full_name": sport_event.get("fullName"),
                "date": sport_event.get("date"),
                "start_date": sport_event.get("startDate"),
                "end_date": sport_event.get("endDate"),
                "address": sport_event.get("address"),
                "full_address": sport_event.get("fullAddress"),
                "country_iso_code": sport_event.get("countryIsoCode"),
            },
            "country": {
                "name": sport_event.get("country", {}).get("name"),
                "iso_code": sport_event.get("country", {}).get("isoCode"),
                "continent": sport_event.get("country", {}).get("continent"),
            } if sport_event.get("country") else None,
            "event_details": {
                "is_individual_event": sport_event.get("isIndividualEvent"),
                "is_team_event": sport_event.get("isTeamEvent"),
                "tournament_type": sport_event.get("tournamentType"),
                "event_type": sport_event.get("eventType"),
                "ranking_type": sport_event.get("rankingType"),
                "continent": sport_event.get("continent"),
            },
            "counts": {
                "weight_categories": sport_event.get("countWeightCategories"),
                "teams": sport_event.get("countTeams"),
                "sessions": sport_event.get("countSessions"),
                "mats": sport_event.get("countMats"),
                "fights": sport_event.get("countFights"),
                "referees": sport_event.get("countReferees"),
            },
            "weight_categories_by_sport": self._process_weight_categories_by_sport(
                sport_event.get("countWeightCategoriesBySport", {})
            ),
            "sports": self._process_sports(sport_event.get("sports", {})),
            "mats": [
                {
                    "id": mat.get("id"),
                    "name": mat.get("name"),
                    "streaming": mat.get("streaming"),
                }
                for mat in sport_event.get("mats", [])
            ],
            "audiences": sport_event.get("audiences", []),
        }
        
        return filtered_data

    def _process_weight_categories_by_sport(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process weight categories grouped by sport and audience"""
        result = []
        sports = data.get("sports", {})
        
        for sport_id, sport_data in sports.items():
            sport_info = {
                "sport_id": sport_id,
                "sport_name": sport_data.get("name"),
                "audiences": []
            }
            
            audiences = sport_data.get("audiences", {})
            for audience_id, audience_data in audiences.items():
                sport_info["audiences"].append({
                    "audience_id": audience_id,
                    "audience_name": audience_data.get("name"),
                    "total": audience_data.get("total"),
                })
            
            result.append(sport_info)
        
        return result

    def _process_sports(self, sports: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process sports data to extract key information"""
        result = []
        
        for sport_id, sport_data in sports.items():
            result.append({
                "id": sport_id,
                "name": sport_data.get("name"),
                "alternate_name": sport_data.get("alternateName"),
                "athlete1_color": sport_data.get("athlete1Color"),
                "athlete2_color": sport_data.get("athlete2Color"),
                "injury_time": sport_data.get("injuryTime"),
                "activity_time": sport_data.get("activityTime"),
                "break_time": sport_data.get("breakTime"),
                "cautions": sport_data.get("cautions"),
            })
        
        return result
