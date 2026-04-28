"""Shared CRUD helpers for service classes."""
from fastapi import HTTPException
from sqlmodel import Session, select
from typing import Generic, TypeVar, Type, Optional, List, Dict, Any, Callable, Awaitable
import logging

ModelType = TypeVar("ModelType")

logger = logging.getLogger(__name__)


class BaseService(Generic[ModelType]):
    def __init__(self, session: Session, model: Type[ModelType]):
        self.session = session
        self.model = model

    def get_by_id(self, id: int) -> Optional[ModelType]:
        return self.session.get(self.model, id)

    def get_all(self) -> List[ModelType]:
        return list(self.session.exec(select(self.model)).all())

    def create(self, entity: ModelType) -> ModelType:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def update(self, entity: ModelType) -> ModelType:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def delete(self, id: int) -> bool:
        entity = self.get_by_id(id)
        if entity:
            self.session.delete(entity)
            self.session.commit()
            return True
        return False

    @staticmethod
    def has_changes(existing, new_data: dict, exclude_fields: set = None) -> bool:
        """Return true when persisted values differ from incoming sync data."""
        exclude = exclude_fields or set()
        for key, new_value in new_data.items():
            if key in exclude:
                continue
            old_value = getattr(existing, key, None)
            if old_value is None and new_value is None:
                continue
            if old_value is None or new_value is None:
                return True
            if str(old_value).strip() != str(new_value).strip():
                return True
        return False

    async def _run_arena_sync_for_event(
        self,
        event_id: int,
        sport_event_uuid: str,
        entity_label: str,
        do_sync: Callable[[str, int], Awaitable[Optional[Dict[str, int]]]],
    ) -> Dict[str, Any]:
        """Run the common Arena event sync flow.

        ``do_sync`` returns created/updated counts, or ``None`` for an empty
        Arena response that should still be treated as a successful sync.
        """
        from ..domain.entities.sport_event import SportEvent

        try:
            event = self.session.exec(
                select(SportEvent).where(SportEvent.id == event_id)
            ).first()
            if not event:
                raise HTTPException(status_code=404, detail=f"Sport event {event_id} not found")

            logger.info(f"Syncing {entity_label} for event: {event.name}")

            result = await do_sync(sport_event_uuid, event.id)

            if result is None:
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "created": 0,
                    "updated": 0,
                }

            self.session.commit()
            logger.info(
                f"{entity_label.capitalize()} for {event.name}: "
                f"{result['created']} created, {result['updated']} updated"
            )
            return {
                "success": True,
                "event_id": sport_event_uuid,
                "event_name": event.name,
                "synced_count": result["created"] + result["updated"],
                "created": result["created"],
                "updated": result["updated"],
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Failed to sync {entity_label} for event {sport_event_uuid}: {str(e)}",
                exc_info=True,
            )
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync {entity_label}: {str(e)}")
