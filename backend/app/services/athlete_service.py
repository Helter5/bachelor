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
        """
        Fetch athletes for a sport event from Arena API

        Args:
            sport_event_id: Sport event UUID

        Returns:
            Arena API response with athletes
        """
        return await fetch_arena_data(f"athlete/{sport_event_id}")

    def get_athletes_by_event(
        self,
        sport_event_id: int,
        team_id: Optional[int] = None
    ) -> List[Athlete]:
        """
        Get all athletes for a sport event from database

        Args:
            sport_event_id: Sport event database ID
            team_id: Optional team ID to filter athletes by team

        Returns:
            List of athletes
        """
        logger.info(f"Fetching athletes for sport_event_id={sport_event_id}, team_id={team_id}")
        query = select(Athlete).where(Athlete.sport_event_id == sport_event_id)

        # Filter by team_id if provided
        if team_id:
            logger.info(f"Filtering by team_id: {team_id}")
            query = query.where(Athlete.team_id == team_id)

        athletes = self.session.exec(query).all()
        logger.info(f"Found {len(athletes)} athletes")
        return list(athletes)

    def get_athletes_by_event_with_teams(
        self,
        sport_event_id: int,
        team_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all athletes for a sport event with team UUIDs joined

        Args:
            sport_event_id: Sport event database ID
            team_id: Optional team ID to filter athletes by team

        Returns:
            List of athlete dictionaries with team_uid field
        """
        logger.info(f"Fetching athletes with teams for sport_event_id={sport_event_id}, team_id={team_id}")
        
        # Join athletes with teams and persons to get name and team UUID
        query = select(Athlete, Team, Person).join(
            Team, Athlete.team_id == Team.id, isouter=True
        ).join(
            Person, Athlete.person_id == Person.id, isouter=True
        ).where(Athlete.sport_event_id == sport_event_id)

        # Filter by team_id if provided
        if team_id:
            logger.info(f"Filtering by team_id: {team_id}")
            query = query.where(Athlete.team_id == team_id)

        results = self.session.exec(query).all()
        logger.info(f"Found {len(results)} athletes")

        # Transform to dictionaries with team_uid
        athletes_with_teams = []
        for athlete, team, person in results:
            athletes_with_teams.append({
                "id": athlete.id,
                "sport_event_id": athlete.sport_event_id,
                "person_full_name": person.full_name if person else None,
                "team_id": team.id if team else None,
                "weight_category_id": athlete.weight_category_id,
                "is_competing": athlete.is_competing,
            })
        
        return athletes_with_teams

    async def sync_athletes_for_event(self, sport_event_uuid: str, event_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, Any]:
        """
        Sync athletes for a sport event from Arena API to database

        Args:
            sport_event_uuid: Sport event UUID from Arena API (used for API call)
            event_id: Local database ID of the sport event

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

            logger.info(f"Syncing athletes for event: {event.name}")

            # Fetch all athletes from Arena API (handles pagination automatically)
            try:
                athletes_list = await fetch_all_arena_items(f"athlete/{sport_event_uuid}", "athletes", source=source)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"No athletes found for event {sport_event_uuid}")
                    return {
                        "success": True,
                        "event_id": sport_event_uuid,
                        "event_name": event.name,
                        "synced_count": 0,
                        "message": "No athletes available for this event"
                    }
                raise

            if not athletes_list:
                logger.warning(f"No athletes data in response for event {sport_event_uuid}")
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "message": "No athletes data in response"
                }

            # Build in-memory maps for FK resolution (arena uuid → local id)
            team_uuid_to_id = await self._build_team_uuid_map(sport_event_uuid, event.id, source)
            wc_key_to_id = self._build_wc_key_map(event.id)

            # Sync each athlete
            result = self._sync_athletes_list(athletes_list, event.id, team_uuid_to_id, wc_key_to_id)

            self.session.commit()
            logger.info(f"Athletes for {event.name}: {result['created']} created, {result['updated']} updated")

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
            logger.error(f"Failed to sync athletes for event {sport_event_uuid}: {str(e)}", exc_info=True)
            self.session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to sync athletes: {str(e)}")

    def _resolve_person(self, first_name: str, last_name: str, country_iso_code: Optional[str]) -> int:
        """
        Find or create a Person record for the given name + country.
        Returns the person.id.
        """
        # Normalize: use empty string for NULL country so unique index works
        country = (country_iso_code or "").strip()

        # Try to find existing person
        statement = select(Person).where(
            Person.first_name == first_name,
            Person.last_name == last_name,
            Person.country_iso_code == (country if country else None)
        )
        person = self.session.exec(statement).first()

        if person:
            return person.id

        # Create new person
        person = Person(
            first_name=first_name,
            last_name=last_name,
            country_iso_code=country if country else None,
        )
        self.session.add(person)
        self.session.flush()  # Get the ID without committing
        logger.info(f"Created new person: {first_name} {last_name} ({country or 'N/A'})")
        return person.id

    def _extract_athletes_list(self, athletes_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract athletes list from Arena API response

        Args:
            athletes_data: Arena API response

        Returns:
            List of athlete dictionaries
        """
        if "athletes" in athletes_data and "items" in athletes_data["athletes"]:
            return athletes_data["athletes"]["items"]
        return []

    async def _build_team_uuid_map(self, sport_event_uuid: str, event_db_id: int, source) -> Dict[str, int]:
        """Fetch Arena teams and build {arena_team_uuid: local_team_id} by name matching."""
        try:
            arena_teams = await fetch_all_arena_items(f"team/{sport_event_uuid}", "sportEventTeams", source=source)
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
        for wc in self.session.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event_db_id)).all():
            if wc.discipline_id and wc.discipline_id in disciplines:
                sport_id, audience_id = disciplines[wc.discipline_id]
                result[(wc.max_weight, sport_id, audience_id)] = wc.id
        return result

    def _sync_athletes_list(self, athletes_list: List[Dict[str, Any]], event_db_id: int,
                            team_uuid_to_id: Dict[str, int], wc_key_to_id: Dict[tuple, int]) -> Dict[str, int]:
        """
        Sync a list of athletes to the database.

        Args:
            athletes_list: List of athlete data from Arena API
            event_db_id: Sport event database ID
            team_uuid_to_id: {arena_team_uuid: local_team_id}
            wc_key_to_id: {(max_weight, sport_id, audience_id): local_wc_id}
        """
        created = 0
        updated = 0

        for athlete_data in athletes_list:
            try:
                # Resolve team_id by Arena UUID → local id (built before loop)
                team_id_db = None
                team_uuid_str = athlete_data.get("sportEventTeamId") or athlete_data.get("teamId")
                if team_uuid_str:
                    team_id_db = team_uuid_to_id.get(team_uuid_str)

                # Resolve weight_category_id from embedded WC data
                weight_category_id_db = None
                wcs = athlete_data.get("weightCategories") or []
                if wcs:
                    wc_item = wcs[0]
                    key = (wc_item.get("maxWeight"), wc_item.get("sportId"), wc_item.get("audienceId"))
                    weight_category_id_db = wc_key_to_id.get(key)

                # Map Arena API fields to database fields
                # athlete/{eventId} endpoint only provides personFullName (not personGivenName/personFamilyName)
                # person/{id}/athletes endpoint provides all three — prefer atomic fields when available
                person_first_name = athlete_data.get("personGivenName") or ""
                person_last_name = athlete_data.get("personFamilyName") or ""
                if not person_first_name and not person_last_name:
                    full = (athlete_data.get("personFullName") or "").strip()
                    if full:
                        # Arena format: "GivenName(s) FAMILYNAME(S)" — family name is all-caps at end
                        parts = full.split()
                        caps_idx = next(
                            (i for i in range(len(parts) - 1, -1, -1) if not parts[i].isupper()),
                            -1
                        )
                        if caps_idx == -1:
                            # All parts are caps — last word = last name, rest = first name
                            person_first_name = " ".join(parts[:-1])
                            person_last_name = parts[-1]
                        elif caps_idx == len(parts) - 1:
                            # No caps parts found at end — use last word as last name
                            person_first_name = " ".join(parts[:-1])
                            person_last_name = parts[-1]
                        else:
                            person_first_name = " ".join(parts[:caps_idx + 1])
                            person_last_name = " ".join(parts[caps_idx + 1:])
                athlete_create = AthleteBase(
                    team_id=team_id_db,
                    sport_event_id=event_db_id,
                    weight_category_id=weight_category_id_db,
                    is_competing=athlete_data.get("isCompeting"),
                )

                # Resolve country from team for person matching
                # Only use country_iso_code (2-letter ISO); alternate_name may be a full country name
                # or 3-letter code that would break flag rendering and person deduplication
                country_iso = None
                if team_id_db:
                    team_obj = self.session.get(Team, team_id_db)
                    if team_obj:
                        country_iso = (team_obj.country_iso_code or "").strip() or None

                # Resolve person_id before athlete lookup (needed for natural key matching)
                person_id = self._resolve_person(person_first_name, person_last_name, country_iso) if (person_first_name or person_last_name) else None

                # Match by natural key (sport_event + person + weight_category)
                existing_athlete = self.session.exec(
                    select(Athlete).where(
                        Athlete.sport_event_id == event_db_id,
                        Athlete.person_id == person_id,
                        Athlete.weight_category_id == weight_category_id_db,
                    )
                ).first() if person_id else None

                if existing_athlete:
                    new_data = athlete_create.model_dump(exclude_unset=True)
                    new_data["person_id"] = person_id
                    if self.has_changes(existing_athlete, new_data, exclude_fields=set()):
                        for key, value in new_data.items():
                            setattr(existing_athlete, key, value)
                        existing_athlete.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_athlete)
                        updated += 1
                        logger.info(f"Updated athlete id={existing_athlete.id}")
                    elif existing_athlete.person_id != person_id:
                        existing_athlete.person_id = person_id
                        self.session.add(existing_athlete)
                    the_athlete = existing_athlete
                else:
                    new_athlete = Athlete(**athlete_create.model_dump())
                    new_athlete.person_id = person_id
                    self.session.add(new_athlete)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new athlete id={new_athlete.id}")
                    the_athlete = new_athlete

            except Exception as e:
                logger.error(f"Failed to sync athlete {athlete_data.get('id')}: {str(e)}", exc_info=True)
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
