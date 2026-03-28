"""
Victory Type Service
Business logic for syncing victory type reference data from Arena API
"""
from sqlmodel import Session, select
from typing import Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

from ..domain.entities.victory_type import VictoryType
from ..domain.entities.weight_category import WeightCategory
from .arena import fetch_arena_data

logger = logging.getLogger(__name__)


class VictoryTypeService:
    def __init__(self, session: Session):
        self.session = session

    async def sync_for_sport(self, sport_id: str) -> Dict[str, int]:
        """Sync victory types for a specific sport from Arena API config."""
        try:
            data = await fetch_arena_data(f"config/victory-types/{sport_id}")
        except HTTPException as e:
            if e.status_code == 404:
                logger.warning(f"No victory types found for sport {sport_id}")
                return {"created": 0, "updated": 0}
            raise

        # Arena API may return {"victoryTypes": [...]} or a direct list
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("victoryTypes", [])
        else:
            logger.warning(f"Unexpected victory types response for sport {sport_id}: {type(data)}")
            return {"created": 0, "updated": 0}

        created = 0
        updated = 0

        for item in items:
            if isinstance(item, str):
                identifier, name = item, None
            elif isinstance(item, dict):
                identifier = item.get("identifier")
                name = item.get("name")
            else:
                continue

            if not identifier:
                continue
            identifier = identifier[:10]

            existing = self.session.exec(
                select(VictoryType).where(VictoryType.code == identifier)
            ).first()
            if existing:
                if existing.type != name:
                    existing.type = name
                    existing.sync_timestamp = datetime.now(timezone.utc)
                    self.session.add(existing)
                    updated += 1
            else:
                self.session.add(VictoryType(code=identifier, type=name))
                created += 1

        self.session.commit()
        logger.info(f"Victory types for sport '{sport_id}': {created} created, {updated} updated")
        return {"created": created, "updated": updated}

    async def sync_for_event(self, sport_event_id: int) -> Dict[str, Any]:
        """Sync victory types for all sports used in an event's weight categories."""
        sport_ids = self.session.exec(
            select(WeightCategory.sport_id)
            .where(WeightCategory.sport_event_id == sport_event_id)
            .where(WeightCategory.sport_id.is_not(None))  # type: ignore
            .distinct()
        ).all()

        total_created = 0
        total_updated = 0
        for sport_id in sport_ids:
            result = await self.sync_for_sport(sport_id)
            total_created += result["created"]
            total_updated += result["updated"]

        return {
            "sports_synced": len(sport_ids),
            "created": total_created,
            "updated": total_updated,
        }
