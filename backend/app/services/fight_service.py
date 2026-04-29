"""Fight synchronization service.

Arena API reference: https://arena.uww.org/api/doc/
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

import re
from sqlalchemy import or_, and_

from ..domain import Fight, FightBase, SportEvent
from ..domain.entities.victory_type import VictoryType
from .base_service import BaseService
from .arena import fetch_arena_data, fetch_all_arena_items

logger = logging.getLogger(__name__)


class FightService(BaseService[Fight]):
    def __init__(self, session: Session):
        super().__init__(session, Fight)

    async def sync_fights_for_event(self, sport_event_uuid: str, event_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """Sync fights for one sport event from Arena into the local database."""
        try:
            event = self.session.exec(
                select(SportEvent).where(SportEvent.id == event_id)
            ).first()

            if not event:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sport event {event_id} not found"
                )

            logger.info(f"Syncing fights for event: {event.name}")

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
                if e.status_code == 500:
                    logger.warning(
                        f"Arena API returned 500 for fights of event {sport_event_uuid}. "
                        f"Skipping event to keep sync resilient."
                    )
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "created": 0,
                        "updated": 0,
                        "message": "Arena API returned 500 for fights. Event was skipped."
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

            # Fight rows have an FK to victory_type; keep reference data in place first.
            try:
                from .victory_type_service import VictoryTypeService
                await VictoryTypeService(self.session).sync_for_event(event.id, source=source)
            except Exception as vt_err:
                logger.warning(f"Victory type sync failed (non-fatal): {vt_err}")

            athlete_uuid_to_id = await self._build_athlete_uuid_map(sport_event_uuid, event.id, source)
            wc_key_to_id = self._build_wc_key_map(event.id)

            result = self._sync_fights_list(fights_list, event.id, athlete_uuid_to_id, wc_key_to_id)

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

    async def _build_athlete_uuid_map(self, sport_event_uuid: str, event_db_id: int, source) -> Dict[str, int]:
        """Build {arena_athlete_uuid: local_athlete_id} by natural key matching."""
        from ..domain import Athlete, Person, Team, WeightCategory
        try:
            arena_athletes = await fetch_all_arena_items(f"athlete/{sport_event_uuid}", "athletes", source=source)
            arena_teams_list = await fetch_all_arena_items(f"team/{sport_event_uuid}", "sportEventTeams", source=source)
            arena_team_names = {
                t["id"]: t.get("name")
                for t in arena_teams_list
                if t.get("id")
            }
        except Exception:
            return {}

        from ..domain.entities.discipline import Discipline
        disciplines = {
            d.id: (d.sport_id, d.audience_id)
            for d in self.session.exec(select(Discipline)).all()
        }
        results = self.session.exec(
            select(Athlete, Person, Team, WeightCategory)
            .join(Person, Athlete.person_id == Person.id, isouter=True)
            .join(Team, Athlete.team_id == Team.id, isouter=True)
            .join(WeightCategory, Athlete.weight_category_id == WeightCategory.id, isouter=True)
            .where(Athlete.sport_event_id == event_db_id)
        ).all()
        db_lookup = {}
        for athlete, person, team, wc in results:
            sport_id, audience_id = disciplines.get(wc.discipline_id, (None, None)) if wc and wc.discipline_id else (None, None)
            key = (
                person.full_name if person else None,
                team.name if team else None,
                wc.max_weight if wc else None,
                sport_id,
                audience_id,
            )
            db_lookup[key] = athlete.id

        uuid_map: Dict[str, int] = {}
        for a in arena_athletes:
            arena_uuid = a.get("id")
            if not arena_uuid:
                continue
            team_uuid = a.get("sportEventTeamId") or a.get("teamId")
            team_name = arena_team_names.get(team_uuid) if team_uuid else None
            wcs = a.get("weightCategories") or []
            wc_data = wcs[0] if wcs else {}
            key = (
                a.get("personFullName"),
                team_name,
                wc_data.get("maxWeight"),
                wc_data.get("sportId"),
                wc_data.get("audienceId"),
            )
            local_id = db_lookup.get(key)
            if local_id:
                uuid_map[arena_uuid] = local_id
        return uuid_map

    def _build_wc_key_map(self, event_db_id: int) -> Dict[tuple, int]:
        """Build {(max_weight, sport_id, audience_id): local_wc_id} from DB."""
        from ..domain import WeightCategory
        from ..domain.entities.discipline import Discipline
        disciplines = {
            d.id: (d.sport_id, d.audience_id)
            for d in self.session.exec(select(Discipline)).all()
        }
        result: Dict[tuple, int] = {}
        for wc in self.session.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event_db_id)).all():
            if wc.discipline_id and wc.discipline_id in disciplines:
                sport_id, audience_id = disciplines[wc.discipline_id]
                result[(wc.max_weight, sport_id, audience_id)] = wc.id
        return result

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

    @staticmethod
    def _winner_id_from_victory_type(code: str | None, fighter_one_id: int | None, fighter_two_id: int | None) -> int | None:
        if not code:
            return None
        if code.startswith("1"):
            return fighter_one_id
        if code.startswith("2"):
            return fighter_two_id
        return None

    def _sync_fights_list(self, fights_list: List[Dict[str, Any]], event_db_id: int,
                         athlete_uuid_to_id: Dict[str, int], wc_key_to_id: Dict[tuple, int]) -> Dict[str, int]:
        """Sync a list of fights to the database."""
        created = 0
        updated = 0

        for fight_data in fights_list:
            try:
                fighter_one_id = athlete_uuid_to_id.get(fight_data.get("fighter1AthleteId") or "")
                fighter_two_id = athlete_uuid_to_id.get(fight_data.get("fighter2AthleteId") or "")

                # winnerFighter uses fighter*Id values, not athlete IDs.
                winner_id = None
                winner_fighter = fight_data.get("winnerFighter")
                if winner_fighter:
                    if winner_fighter == fight_data.get("fighter1Id") or winner_fighter == fight_data.get("fighter1"):
                        winner_id = fighter_one_id
                    elif winner_fighter == fight_data.get("fighter2Id") or winner_fighter == fight_data.get("fighter2"):
                        winner_id = fighter_two_id
                if winner_id is None:
                    winner_id = self._winner_id_from_victory_type(
                        fight_data.get("victoryType"),
                        fighter_one_id,
                        fighter_two_id,
                    )

                weight_category_id = wc_key_to_id.get((
                    fight_data.get("weightCategoryMaxWeight"),
                    fight_data.get("sportId"),
                    fight_data.get("audienceId"),
                ))

                cp_one = fight_data.get("fighter1RankingPoint")
                cp_two = fight_data.get("fighter2RankingPoint")

                # Arena only exposes technical points inside result text.
                tp_one = None
                tp_two = None
                result_text = fight_data.get("result", "")
                tp_match = re.search(r'\((\d+)-(\d+)\)', result_text)
                if tp_match:
                    tp_one = int(tp_match.group(1))
                    tp_two = int(tp_match.group(2))

                duration = fight_data.get("endTime")
                round_name = fight_data.get("round")
                fight_number = fight_data.get("fightNumber")

                fight_create = FightBase(
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
                    round_name=round_name,
                    fight_number=fight_number,
                )

                # Legacy Arena data can miss fight_number, so fall back to the fighter pair.
                existing_fight = None
                if fight_number is not None:
                    existing_fight = self.session.exec(
                        select(Fight).where(
                            Fight.sport_event_id == event_db_id,
                            Fight.fight_number == fight_number,
                            Fight.weight_category_id == weight_category_id,
                        )
                    ).first()
                elif fighter_one_id and fighter_two_id:
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

                if existing_fight:
                    new_data = fight_create.model_dump(exclude_unset=True)
                    if self.has_changes(existing_fight, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_fight, key, value)
                        existing_fight.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_fight)
                        updated += 1
                        logger.info(f"Updated fight id={existing_fight.id}")
                else:
                    new_fight = Fight(**fight_create.model_dump())
                    self.session.add(new_fight)
                    created += 1
                    logger.info(f"Created new fight number={fight_number}")

            except Exception as e:
                logger.error(f"Failed to sync fight {fight_data.get('id')}: {str(e)}", exc_info=True)
                continue

        return {"created": created, "updated": updated}
