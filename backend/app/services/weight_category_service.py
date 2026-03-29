"""
Weight Category Service
Business logic for weight category operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain import WeightCategory, WeightCategoryBase, SportEvent
from ..domain.entities.discipline import Discipline
from .base_service import BaseService
from .arena import fetch_arena_data

logger = logging.getLogger(__name__)


class WeightCategoryService(BaseService[WeightCategory]):
    """Service for weight category operations"""

    def __init__(self, session: Session):
        super().__init__(session, WeightCategory)

    async def get_weight_categories_from_arena(self, sport_event_id: str) -> Dict[str, Any]:
        """
        Fetch weight categories for a sport event from Arena API

        Args:
            sport_event_id: Sport event UUID

        Returns:
            Arena API response with weight categories
        """
        return await fetch_arena_data(f"weight-category/{sport_event_id}")

    def get_weight_categories_by_event(self, sport_event_id: int) -> List[WeightCategory]:
        """
        Get all weight categories for a sport event from database

        Args:
            sport_event_id: Sport event database ID

        Returns:
            List of weight categories
        """
        statement = select(WeightCategory).where(WeightCategory.sport_event_id == sport_event_id)
        return list(self.session.exec(statement).all())

    async def sync_weight_categories_for_event(self, sport_event_uuid: str, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """
        Sync weight categories for a sport event from Arena API to database

        Args:
            sport_event_uuid: Sport event UUID from Arena API

        Returns:
            Dict with sync results

        Raises:
            HTTPException: If event not found or sync fails
        """
        try:
            # Find the sport event by Arena UUID to get its database ID
            event = self.session.exec(
                select(SportEvent).where(SportEvent.arena_uuid == sport_event_uuid)
            ).first()

            if not event:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sport event {sport_event_uuid} not found"
                )

            logger.info(f"Syncing weight categories for event: {event.arena_uuid} - {event.name}")

            # Fetch weight categories from Arena API
            try:
                wc_data = await fetch_arena_data(f"weight-category/{sport_event_uuid}", source=source)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No weight categories found for event {sport_event_uuid}")
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "message": "No weight categories available for this event"
                    }
                raise

            # Extract weight categories list from Arena API response
            wc_list = self._extract_weight_categories_list(wc_data)

            if not wc_list:
                logger.warning(f"No weight categories data in response for event {sport_event_uuid}")
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "message": "No weight categories data in response"
                }

            # Sync each weight category
            result = self._sync_weight_categories_list(wc_list, event.id, source=source)

            self.session.commit()
            logger.info(f"Categories for {event.name}: {result['created']} created, {result['updated']} updated")

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
            logger.error(f"Failed to sync weight categories for event {sport_event_uuid}: {str(e)}", exc_info=True)
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync weight categories: {str(e)}")

    def _extract_weight_categories_list(self, wc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract weight categories list from Arena API response

        Args:
            wc_data: Arena API response

        Returns:
            List of weight category dictionaries
        """
        if "weightCategories" in wc_data:
            return wc_data["weightCategories"]
        return []

    def _sync_weight_categories_list(self, wc_list: List[Dict[str, Any]], event_db_id: int, source=None) -> Dict[str, int]:
        """
        Sync a list of weight categories to the database

        Args:
            wc_list: List of weight category data from Arena API
            event_db_id: Sport event database ID
            source: Optional ArenaSource — when provided, records per-source UUID mappings

        Returns:
            Dict with created and updated counts
        """
        created = 0
        updated = 0

        for wc in wc_list:
            try:
                # Resolve or create discipline based on sport_id
                sport_id = wc.get("sportId")
                discipline_id = None
                if sport_id:
                    discipline = self.session.exec(
                        select(Discipline).where(Discipline.sport_id == sport_id)
                    ).first()
                    if not discipline:
                        discipline = Discipline(
                            sport_id=sport_id,
                            sport_name=wc.get("sportName"),
                            audience_id=wc.get("audienceId"),
                            audience_name=wc.get("audienceName"),
                            rounds_number=wc.get("roundsNumber"),
                            round_duration=wc.get("roundDuration"),
                            tournament_type=wc.get("tournamentType"),
                        )
                        self.session.add(discipline)
                        self.session.flush()
                    discipline_id = discipline.id

                # Map Arena API fields to database fields
                wc_create = WeightCategoryBase(
                    uid=UUID(wc["id"]),
                    discipline_id=discipline_id,
                    max_weight=wc.get("maxWeight"),
                    count_fighters=wc.get("countFighters"),
                    is_started=wc.get("isStarted"),
                    is_completed=wc.get("isCompleted"),
                    sport_event_id=event_db_id,
                )

                # Check if weight category already exists by natural key (sport_event + max_weight + discipline)
                existing_wc = self.session.exec(
                    select(WeightCategory).where(
                        WeightCategory.sport_event_id == event_db_id,
                        WeightCategory.max_weight == wc.get("maxWeight"),
                        WeightCategory.discipline_id == discipline_id,
                    )
                ).first()

                if existing_wc:
                    new_data = wc_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_wc, new_data, exclude_fields={"uid"}):
                        for key, value in new_data.items():
                            if key != "uid":
                                setattr(existing_wc, key, value)
                        existing_wc.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_wc)
                        updated += 1
                        logger.info(f"Updated weight category: {wc_create.uid}")
                    the_wc = existing_wc
                else:
                    # Create new weight category
                    new_wc = WeightCategory(**wc_create.model_dump())
                    self.session.add(new_wc)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new weight category: {wc_create.uid}")
                    the_wc = new_wc

                if source:
                    from ..domain.entities.weight_category_source_uid import WeightCategorySourceUid
                    existing_map = self.session.exec(
                        select(WeightCategorySourceUid).where(
                            WeightCategorySourceUid.arena_source_id == source.id,
                            WeightCategorySourceUid.arena_uuid == wc_create.uid,
                        )
                    ).first()
                    if not existing_map:
                        self.session.add(WeightCategorySourceUid(
                            weight_category_id=the_wc.id,
                            arena_source_id=source.id,
                            arena_uuid=wc_create.uid,
                        ))
                        self.session.flush()

            except Exception as e:
                logger.error(f"Failed to sync weight category {wc.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}
