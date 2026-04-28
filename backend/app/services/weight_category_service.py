"""Weight category synchronization and lookup service.

Arena API reference: https://arena.uww.org/api/doc/
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
    def __init__(self, session: Session):
        super().__init__(session, WeightCategory)

    async def get_weight_categories_from_arena(self, sport_event_id: str) -> Dict[str, Any]:
        return await fetch_arena_data(f"weight-category/{sport_event_id}")

    def get_weight_categories_by_event(self, sport_event_id: int) -> List[WeightCategory]:
        statement = select(WeightCategory).where(WeightCategory.sport_event_id == sport_event_id)
        return list(self.session.exec(statement).all())

    async def sync_weight_categories_for_event(self, sport_event_uuid: str, event_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """Sync weight categories for one sport event from Arena."""
        try:
            event = self.session.exec(
                select(SportEvent).where(SportEvent.id == event_id)
            ).first()

            if not event:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sport event {event_id} not found"
                )

            logger.info(f"Syncing weight categories for event: {event.name}")

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
        if "weightCategories" in wc_data:
            return wc_data["weightCategories"]
        return []

    def _sync_weight_categories_list(self, wc_list: List[Dict[str, Any]], event_db_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, int]:
        """Sync weight categories and create missing discipline records."""
        created = 0
        updated = 0

        for wc in wc_list:
            try:
                sport_id = wc.get("sportId")
                audience_id = wc.get("audienceId")
                discipline_id = None
                if sport_id:
                    discipline = self.session.exec(
                        select(Discipline).where(
                            Discipline.sport_id == sport_id,
                            Discipline.audience_id == audience_id,
                        )
                    ).first()
                    if not discipline:
                        discipline = Discipline(
                            sport_id=sport_id,
                            sport_name=wc.get("sportName"),
                            audience_id=audience_id,
                            audience_name=wc.get("audienceName"),
                            rounds_number=wc.get("roundsNumber"),
                            round_duration=wc.get("roundDuration"),
                            tournament_type=wc.get("tournamentType"),
                        )
                        self.session.add(discipline)
                        self.session.flush()
                    else:
                        # Keep discipline metadata fresh without changing identity.
                        discipline.sport_name = wc.get("sportName") or discipline.sport_name
                        discipline.audience_name = wc.get("audienceName") or discipline.audience_name
                        discipline.rounds_number = wc.get("roundsNumber")
                        discipline.round_duration = wc.get("roundDuration")
                        discipline.tournament_type = wc.get("tournamentType")
                        self.session.add(discipline)
                    discipline_id = discipline.id

                wc_create = WeightCategoryBase(
                    discipline_id=discipline_id,
                    max_weight=wc.get("maxWeight"),
                    count_fighters=wc.get("countFighters"),
                    is_started=wc.get("isStarted"),
                    is_completed=wc.get("isCompleted"),
                    sport_event_id=event_db_id,
                )

                existing_wc = self.session.exec(
                    select(WeightCategory).where(
                        WeightCategory.sport_event_id == event_db_id,
                        WeightCategory.max_weight == wc.get("maxWeight"),
                        WeightCategory.discipline_id == discipline_id,
                    )
                ).first()

                if existing_wc:
                    new_data = wc_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_wc, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_wc, key, value)
                        existing_wc.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_wc)
                        updated += 1
                        logger.info(f"Updated weight category: {existing_wc.id}")
                    the_wc = existing_wc
                else:
                    new_wc = WeightCategory(**wc_create.model_dump())
                    self.session.add(new_wc)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new weight category: {new_wc.id}")
                    the_wc = new_wc

            except Exception as e:
                logger.error(f"Failed to sync weight category {wc.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}
