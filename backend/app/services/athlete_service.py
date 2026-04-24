"""
Athlete Service
Business logic for athlete operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from datetime import datetime, timezone

from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain import Athlete, AthleteBase, SportEvent, Team, WeightCategory, Person
from .base_service import BaseService
from .arena import fetch_arena_data, fetch_all_arena_items

logger = logging.getLogger(__name__)


class AthleteService(BaseService[Athlete]):
    """Service for athlete operations"""

    def __init__(self, session: Session):
        super().__init__(session, Athlete)

    async def get_athletes_from_arena(self, sport_event_id: str) -> Dict[str, Any]:
        """Fetch athletes for a sport event from Arena API."""
        return await fetch_arena_data(f"athlete/{sport_event_id}")

    def get_athletes_by_event(
        self,
        sport_event_id: int,
        team_id: Optional[int] = None
    ) -> List[Athlete]:
        """Get all athletes for a sport event from database."""
        query = select(Athlete).where(Athlete.sport_event_id == sport_event_id)
        if team_id:
            query = query.where(Athlete.team_id == team_id)
        return list(self.session.exec(query).all())

    def get_athletes_by_event_with_teams(
        self,
        sport_event_id: int,
        team_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get all athletes for a sport event with team UUIDs joined."""
        query = select(Athlete, Team, Person).join(
            Team, Athlete.team_id == Team.id, isouter=True
        ).join(
            Person, Athlete.person_id == Person.id, isouter=True
        ).where(Athlete.sport_event_id == sport_event_id)

        if team_id:
            query = query.where(Athlete.team_id == team_id)

        results = self.session.exec(query).all()
        return [
            {
                "id": athlete.id,
                "sport_event_id": athlete.sport_event_id,
                "person_full_name": person.full_name if person else None,
                "team_id": team.id if team else None,
                "weight_category_id": athlete.weight_category_id,
                "is_competing": athlete.is_competing,
            }
            for athlete, team, person in results
        ]

    async def sync_athletes_for_event(
        self,
        sport_event_uuid: str,
        event_id: int,
        source: Optional["ArenaSource"] = None,
    ) -> Dict[str, Any]:
        """Sync athletes for a sport event from Arena API to database."""
        async def _do_sync(uuid: str, event_db_id: int) -> Optional[Dict[str, int]]:
            try:
                athletes_list = await fetch_all_arena_items(
                    f"athlete/{uuid}", "athletes", source=source
                )
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No athletes found for event {uuid}")
                    return None
                raise

            if not athletes_list:
                logger.warning(f"No athletes data in response for event {uuid}")
                return None

            team_uuid_to_id = await self._build_team_uuid_map(uuid, event_db_id, source)
            wc_key_to_id = self._build_wc_key_map(event_db_id)
            return self._sync_athletes_list(athletes_list, event_db_id, team_uuid_to_id, wc_key_to_id)

        return await self._run_arena_sync_for_event(event_id, sport_event_uuid, "athletes", _do_sync)

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    def _resolve_person(
        self,
        first_name: str,
        last_name: str,
        country_iso_code: Optional[str],
    ) -> int:
        """Find or create a Person record. Returns person.id."""
        country = (country_iso_code or "").strip()
        statement = select(Person).where(
            Person.first_name == first_name,
            Person.last_name == last_name,
            Person.country_iso_code == (country if country else None),
        )
        person = self.session.exec(statement).first()
        if person:
            return person.id

        person = Person(
            first_name=first_name,
            last_name=last_name,
            country_iso_code=country if country else None,
        )
        self.session.add(person)
        self.session.flush()
        logger.info(f"Created new person: {first_name} {last_name} ({country or 'N/A'})")
        return person.id

    def _resolve_team_id(
        self,
        athlete_data: Dict[str, Any],
        team_uuid_to_id: Dict[str, int],
    ) -> Optional[int]:
        """Resolve Arena team UUID → local team DB id."""
        team_uuid = athlete_data.get("sportEventTeamId") or athlete_data.get("teamId")
        return team_uuid_to_id.get(team_uuid) if team_uuid else None

    def _resolve_weight_category_id(
        self,
        athlete_data: Dict[str, Any],
        wc_key_to_id: Dict[tuple, int],
    ) -> Optional[int]:
        """Resolve embedded weight-category data → local WC DB id."""
        wcs = athlete_data.get("weightCategories") or []
        if not wcs:
            return None
        wc_item = wcs[0]
        key = (wc_item.get("maxWeight"), wc_item.get("sportId"), wc_item.get("audienceId"))
        return wc_key_to_id.get(key)

    def _resolve_country_iso(self, team_id_db: Optional[int]) -> Optional[str]:
        """Resolve country ISO code from a local team record."""
        if not team_id_db:
            return None
        team_obj = self.session.get(Team, team_id_db)
        if team_obj:
            return (team_obj.country_iso_code or "").strip() or None
        return None

    def _upsert_athlete(
        self,
        athlete_create: AthleteBase,
        person_id: Optional[int],
        event_db_id: int,
    ) -> Optional[str]:
        """Insert or update an athlete. Returns 'created', 'updated', or None (no change)."""
        existing = self.session.exec(
            select(Athlete).where(
                Athlete.sport_event_id == event_db_id,
                Athlete.person_id == person_id,
                Athlete.weight_category_id == athlete_create.weight_category_id,
            )
        ).first() if person_id else None

        if existing:
            new_data = athlete_create.model_dump(exclude_unset=True)
            new_data["person_id"] = person_id
            if self.has_changes(existing, new_data, exclude_fields=set()):
                for key, value in new_data.items():
                    setattr(existing, key, value)
                existing.sync_timestamp = datetime.now(timezone.utc)
                self.session.add(existing)
                return "updated"
            if existing.person_id != person_id:
                existing.person_id = person_id
                self.session.add(existing)
            return None

        new_athlete = Athlete(**athlete_create.model_dump())
        new_athlete.person_id = person_id
        self.session.add(new_athlete)
        self.session.flush()
        return "created"

    def _extract_athletes_list(self, athletes_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract athletes list from Arena API response."""
        if "athletes" in athletes_data and "items" in athletes_data["athletes"]:
            return athletes_data["athletes"]["items"]
        return []

    async def _build_team_uuid_map(
        self,
        sport_event_uuid: str,
        event_db_id: int,
        source,
    ) -> Dict[str, int]:
        """Fetch Arena teams and build {arena_team_uuid: local_team_id} by name matching."""
        try:
            arena_teams = await fetch_all_arena_items(
                f"team/{sport_event_uuid}", "sportEventTeams", source=source
            )
        except Exception:
            return {}
        db_teams = self.session.exec(select(Team).where(Team.sport_event_id == event_db_id)).all()
        db_team_by_name = {t.name: t.id for t in db_teams}
        db_team_by_alt_name = {t.alternate_name: t.id for t in db_teams if t.alternate_name}
        result = {}
        for t in arena_teams:
            uuid_str = t.get("id")
            name = t.get("name")
            if uuid_str and name:
                if name in db_team_by_name:
                    result[uuid_str] = db_team_by_name[name]
                elif name in db_team_by_alt_name:
                    result[uuid_str] = db_team_by_alt_name[name]
        return result

    def _build_wc_key_map(self, event_db_id: int) -> Dict[tuple, int]:
        """Build {(max_weight, sport_id, audience_id): local_wc_id} from DB."""
        from ..domain.entities.discipline import Discipline
        disciplines = {
            d.id: (d.sport_id, d.audience_id)
            for d in self.session.exec(select(Discipline)).all()
        }
        result = {}
        for wc in self.session.exec(
            select(WeightCategory).where(WeightCategory.sport_event_id == event_db_id)
        ).all():
            if wc.discipline_id and wc.discipline_id in disciplines:
                sport_id, audience_id = disciplines[wc.discipline_id]
                result[(wc.max_weight, sport_id, audience_id)] = wc.id
        return result

    def _sync_athletes_list(
        self,
        athletes_list: List[Dict[str, Any]],
        event_db_id: int,
        team_uuid_to_id: Dict[str, int],
        wc_key_to_id: Dict[tuple, int],
    ) -> Dict[str, int]:
        """Sync a list of athletes to the database."""
        created = 0
        updated = 0

        for athlete_data in athletes_list:
            try:
                team_id_db = self._resolve_team_id(athlete_data, team_uuid_to_id)
                weight_category_id_db = self._resolve_weight_category_id(athlete_data, wc_key_to_id)

                # Name extraction
                # athlete/{eventId} only provides personFullName; person/{id}/athletes
                # provides personGivenName + personFamilyName — prefer atomic fields when available.
                person_first_name = athlete_data.get("personGivenName") or ""
                person_last_name = athlete_data.get("personFamilyName") or ""
                if not person_first_name and not person_last_name:
                    full = (athlete_data.get("personFullName") or "").strip()
                    if full:
                        # Arena format: "GivenName(s) FAMILYNAME(S)" — family name is all-caps at end
                        parts = full.split()
                        caps_idx = next(
                            (i for i in range(len(parts) - 1, -1, -1) if not parts[i].isupper()),
                            -1,
                        )
                        if caps_idx == -1 or caps_idx == len(parts) - 1:
                            person_first_name = " ".join(parts[:-1])
                            person_last_name = parts[-1]
                        else:
                            person_first_name = " ".join(parts[: caps_idx + 1])
                            person_last_name = " ".join(parts[caps_idx + 1 :])

                athlete_create = AthleteBase(
                    team_id=team_id_db,
                    sport_event_id=event_db_id,
                    weight_category_id=weight_category_id_db,
                    is_competing=athlete_data.get("isCompeting"),
                )

                country_iso = self._resolve_country_iso(team_id_db)
                person_id = (
                    self._resolve_person(person_first_name, person_last_name, country_iso)
                    if (person_first_name or person_last_name)
                    else None
                )

                outcome = self._upsert_athlete(athlete_create, person_id, event_db_id)
                if outcome == "created":
                    created += 1
                    logger.info(f"Created new athlete for person_id={person_id}")
                elif outcome == "updated":
                    updated += 1

            except Exception as e:
                logger.error(
                    f"Failed to sync athlete {athlete_data.get('id')}: {str(e)}", exc_info=True
                )
                continue

        return {"created": created, "updated": updated}

    def get_all_with_details(self) -> List[Dict[str, Any]]:
        """Get all athletes from database with related team and weight category data."""
        athletes = self.session.exec(select(Athlete)).all()

        person_ids = {a.person_id for a in athletes if a.person_id}
        team_ids = {a.team_id for a in athletes if a.team_id}
        wc_ids = {a.weight_category_id for a in athletes if a.weight_category_id}

        persons = (
            {p.id: p for p in self.session.exec(select(Person).where(Person.id.in_(person_ids))).all()}
            if person_ids else {}
        )
        teams = (
            {t.id: t for t in self.session.exec(select(Team).where(Team.id.in_(team_ids))).all()}
            if team_ids else {}
        )
        weight_cats = (
            {w.id: w for w in self.session.exec(select(WeightCategory).where(WeightCategory.id.in_(wc_ids))).all()}
            if wc_ids else {}
        )

        return [
            {
                "id": a.id,
                "person_full_name": persons[a.person_id].full_name if a.person_id in persons else None,
                "is_competing": a.is_competing,
                "country_iso_code": teams[a.team_id].country_iso_code if a.team_id in teams else None,
                "weight_category": weight_cats[a.weight_category_id].name if a.weight_category_id in weight_cats else None,
            }
            for a in athletes
        ]
