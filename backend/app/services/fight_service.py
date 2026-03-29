"""
Fight Service
Business logic for fight/match operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

import re
from sqlalchemy import or_, and_

from ..domain import Fight, FightBase, SportEvent, Athlete, WeightCategory
from ..domain.entities.victory_type import VictoryType
from .base_service import BaseService
from .arena import fetch_arena_data

logger = logging.getLogger(__name__)


class FightService(BaseService[Fight]):
    """Service for fight operations"""

    def __init__(self, session: Session):
        super().__init__(session, Fight)

    async def sync_fights_for_event(self, sport_event_uuid: str, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """
        Sync fights for a sport event from Arena API to database
        """
        try:
            # Find the sport event by Arena UUID
            event = self.session.exec(
                select(SportEvent).where(SportEvent.arena_uuid == sport_event_uuid)
            ).first()

            if not event:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sport event {sport_event_uuid} not found"
                )

            logger.info(f"Syncing fights for event: {event.name}")

            # Fetch fights from Arena API
            try:
                fights_data = await fetch_arena_data(f"fight/{sport_event_uuid}", source=source)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No fights found for event {sport_event_uuid}")
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "created": 0,
                        "updated": 0,
                        "message": "No fights available for this event"
                    }
                raise

            fights_list = fights_data.get("fights", [])

            if not fights_list:
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "created": 0,
                    "updated": 0,
                    "message": "No fights data in response"
                }

            # Sync victory types for the event's sports before processing fights
            # (needed for FK constraint on fights.victory_type)
            try:
                from .victory_type_service import VictoryTypeService
                await VictoryTypeService(self.session).sync_for_event(event.id, source=source)
            except Exception as vt_err:
                logger.warning(f"Victory type sync failed (non-fatal): {vt_err}")

            result = self._sync_fights_list(fights_list, event.id, source=source)

            self.session.commit()
            logger.info(f"Fights for {event.name}: {result['created']} created, {result['updated']} updated")

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
            logger.error(f"Failed to sync fights for event {sport_event_uuid}: {str(e)}", exc_info=True)
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync fights: {str(e)}")

    def _resolve_athlete_id(self, arena_fighter_id: str, source=None) -> int | None:
        """Look up local athlete DB id by Arena UUID"""
        if not arena_fighter_id:
            return None
        try:
            uuid = UUID(arena_fighter_id)
        except Exception:
            return None
        athlete = self.session.exec(
            select(Athlete).where(Athlete.uid == uuid)
        ).first()
        if athlete:
            return athlete.id
        if source:
            from ..domain.entities.athlete_source_uid import AthleteSourceUid
            mapping = self.session.exec(
                select(AthleteSourceUid).where(
                    AthleteSourceUid.arena_source_id == source.id,
                    AthleteSourceUid.arena_uuid == uuid,
                )
            ).first()
            if mapping:
                return mapping.athlete_id
        return None

    def _resolve_victory_type(self, code: str | None) -> str | None:
        """Return victory type code, auto-creating a minimal record if needed (FK guard)."""
        if not code:
            return None
        code = code[:10]
        exists = self.session.exec(
            select(VictoryType).where(VictoryType.code == code)
        ).first()
        if not exists:
            self.session.add(VictoryType(code=code))
            self.session.flush()
        return code

    def _resolve_weight_category_id(self, arena_wc_id: str, source=None) -> int | None:
        """Look up local weight category DB id by Arena UUID"""
        if not arena_wc_id:
            return None
        try:
            uuid = UUID(arena_wc_id)
        except Exception:
            return None
        wc = self.session.exec(
            select(WeightCategory).where(WeightCategory.uid == uuid)
        ).first()
        if wc:
            return wc.id
        if source:
            from ..domain.entities.weight_category_source_uid import WeightCategorySourceUid
            mapping = self.session.exec(
                select(WeightCategorySourceUid).where(
                    WeightCategorySourceUid.arena_source_id == source.id,
                    WeightCategorySourceUid.arena_uuid == uuid,
                )
            ).first()
            if mapping:
                return mapping.weight_category_id
        return None

    def _sync_fights_list(self, fights_list: List[Dict[str, Any]], event_db_id: int, source=None) -> Dict[str, int]:
        """
        Sync a list of fights to the database
        """
        created = 0
        updated = 0

        for fight_data in fights_list:
            try:
                fight_uid = fight_data.get("id")
                if not fight_uid:
                    continue

                # Resolve foreign keys from Arena UUIDs to local DB IDs
                # Arena uses fighter*AthleteId (matches our athlete.uid), NOT fighter*Id
                fighter_one_id = self._resolve_athlete_id(fight_data.get("fighter1AthleteId"), source=source)
                fighter_two_id = self._resolve_athlete_id(fight_data.get("fighter2AthleteId"), source=source)

                # Winner: winnerFighter uses fighter*Id space, so map it back
                winner_id = None
                winner_fighter = fight_data.get("winnerFighter")
                winner_fighter_slot = None  # "one" or "two"
                if winner_fighter:
                    if winner_fighter == fight_data.get("fighter1Id") or winner_fighter == fight_data.get("fighter1"):
                        winner_id = fighter_one_id
                        winner_fighter_slot = "one"
                    elif winner_fighter == fight_data.get("fighter2Id") or winner_fighter == fight_data.get("fighter2"):
                        winner_id = fighter_two_id
                        winner_fighter_slot = "two"

                weight_category_id = self._resolve_weight_category_id(
                    fight_data.get("sportEventWeightCategoryId"), source=source
                )

                # Classification points from ranking points
                cp_one = fight_data.get("fighter1RankingPoint")
                cp_two = fight_data.get("fighter2RankingPoint")

                # Technical points: parse from result text "CP1-CP2(TP1-TP2) by TYPE"
                tp_one = None
                tp_two = None
                result_text = fight_data.get("result", "")
                tp_match = re.search(r'\((\d+)-(\d+)\)', result_text)
                if tp_match:
                    tp_one = int(tp_match.group(1))
                    tp_two = int(tp_match.group(2))

                # Duration: endTime (seconds)
                duration = fight_data.get("endTime")

                fight_create = FightBase(
                    uid=UUID(fight_uid),
                    sport_event_id=event_db_id,
                    weight_category_id=weight_category_id,
                    fighter_one_id=fighter_one_id,
                    fighter_two_id=fighter_two_id,
                    winner_id=winner_id,
                    tp_one=tp_one,
                    tp_two=tp_two,
                    cp_one=cp_one,
                    cp_two=cp_two,
                    victory_type=self._resolve_victory_type(fight_data.get("victoryType")),
                    duration=duration,
                )

                # Check if fight already exists by natural key (sport_event + fighters + weight_category)
                # OR handles cases where fighter order differs across Arena instances
                existing_fight = None
                if fighter_one_id and fighter_two_id:
                    existing_fight = self.session.exec(
                        select(Fight).where(
                            Fight.sport_event_id == event_db_id,
                            Fight.weight_category_id == weight_category_id,
                            or_(
                                and_(Fight.fighter_one_id == fighter_one_id, Fight.fighter_two_id == fighter_two_id),
                                and_(Fight.fighter_one_id == fighter_two_id, Fight.fighter_two_id == fighter_one_id),
                            )
                        )
                    ).first()
                if not existing_fight:
                    existing_fight = self.session.exec(
                        select(Fight).where(Fight.uid == fight_create.uid)
                    ).first()

                if existing_fight:
                    new_data = fight_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_fight, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_fight, key, value)
                        existing_fight.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_fight)
                        updated += 1
                        logger.info(f"Updated fight: {fight_create.uid}")
                else:
                    new_fight = Fight(**fight_create.model_dump())
                    self.session.add(new_fight)
                    created += 1
                    logger.info(f"Created new fight: {fight_create.uid}")

            except Exception as e:
                logger.error(f"Failed to sync fight {fight_data.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}
