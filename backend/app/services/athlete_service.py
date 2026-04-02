"""
Athlete Service
Business logic for athlete operations
"""
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import logging

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource

from ..domain import Athlete, AthleteBase, SportEvent, Team, WeightCategory, Person
from .base_service import BaseService
from .arena import fetch_arena_data

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
                "team_uid": str(team.uid) if team else None,  # Return team UUID as string
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

            # Fetch athletes from Arena API
            try:
                athletes_data = await fetch_arena_data(f"athlete/{sport_event_uuid}", source=source)
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

            # Extract athletes list from Arena API response
            athletes_list = self._extract_athletes_list(athletes_data)

            if not athletes_list:
                logger.warning(f"No athletes data in response for event {sport_event_uuid}")
                return {
                    "success": True,
                    "event_id": sport_event_uuid,
                    "event_name": event.name,
                    "synced_count": 0,
                    "message": "No athletes data in response"
                }

            # Sync each athlete
            result = self._sync_athletes_list(athletes_list, event.id, source=source)

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

    def _resolve_person(self, full_name: str, country_iso_code: Optional[str]) -> int:
        """
        Find or create a Person record for the given name + country.
        Returns the person.id.
        """
        # Normalize: use empty string for NULL country so unique index works
        country = (country_iso_code or "").strip()

        # Try to find existing person
        statement = select(Person).where(
            Person.full_name == full_name,
            Person.country_iso_code == (country if country else None)
        )
        person = self.session.exec(statement).first()

        if person:
            return person.id

        # Create new person
        person = Person(
            full_name=full_name,
            country_iso_code=country if country else None,
        )
        self.session.add(person)
        self.session.flush()  # Get the ID without committing
        logger.info(f"Created new person: {full_name} ({country or 'N/A'})")
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

    def _sync_athletes_list(self, athletes_list: List[Dict[str, Any]], event_db_id: int, source: Optional["ArenaSource"] = None) -> Dict[str, int]:
        """
        Sync a list of athletes to the database

        Args:
            athletes_list: List of athlete data from Arena API
            event_db_id: Sport event database ID
            source: Optional ArenaSource — when provided, records per-source UUID mappings

        Returns:
            Dict with created and updated counts
        """
        created = 0
        updated = 0

        for athlete_data in athletes_list:
            try:
                # Resolve team_id: look up database integer ID by uid
                team_id_db = None
                team_id_value = athlete_data.get("sportEventTeamId") or athlete_data.get("teamId")
                if team_id_value:
                    team_uuid = UUID(team_id_value)
                    team = self.session.exec(
                        select(Team).where(Team.uid == team_uuid)
                    ).first()
                    if team:
                        team_id_db = team.id

                # Resolve weight_category_id: look up database integer ID by uid
                weight_category_id_db = None
                if athlete_data.get("weightCategories") and len(athlete_data["weightCategories"]) > 0:
                    wc_uuid = UUID(athlete_data["weightCategories"][0]["id"])
                    wc = self.session.exec(
                        select(WeightCategory).where(WeightCategory.uid == wc_uuid)
                    ).first()
                    if wc:
                        weight_category_id_db = wc.id

                # Map Arena API fields to database fields
                person_full_name = athlete_data.get("personFullName")
                athlete_create = AthleteBase(
                    uid=UUID(athlete_data["id"]),
                    team_id=team_id_db,
                    sport_event_id=event_db_id,
                    weight_category_id=weight_category_id_db,
                    is_competing=athlete_data.get("isCompeting"),
                )

                # Resolve country from team for person matching
                # Fall back to alternate_name (e.g. "UWW") when country_iso_code is missing
                country_iso = None
                if team_id_db:
                    team_obj = self.session.get(Team, team_id_db)
                    if team_obj:
                        country_iso = (team_obj.country_iso_code or "").strip() or \
                                      (team_obj.alternate_name or "").strip() or None

                # Resolve person_id before athlete lookup (needed for natural key matching)
                person_id = self._resolve_person(person_full_name, country_iso) if person_full_name else None

                # Check if athlete already exists by natural key (sport_event + person + weight_category)
                existing_athlete = self.session.exec(
                    select(Athlete).where(
                        Athlete.sport_event_id == event_db_id,
                        Athlete.person_id == person_id,
                        Athlete.weight_category_id == weight_category_id_db,
                    )
                ).first() if person_id else None

                # Fall back to uid lookup if no person match (e.g. athlete without name)
                if not existing_athlete:
                    existing_athlete = self.session.exec(
                        select(Athlete).where(Athlete.uid == athlete_create.uid)
                    ).first()

                if existing_athlete:
                    new_data = athlete_create.model_dump(exclude_unset=True)
                    new_data["person_id"] = person_id
                    if self.has_changes(existing_athlete, new_data, exclude_fields={"uid"}):
                        for key, value in new_data.items():
                            if key != "uid":
                                setattr(existing_athlete, key, value)
                        existing_athlete.sync_timestamp = datetime.now(timezone.utc)
                        self.session.add(existing_athlete)
                        updated += 1
                        logger.info(f"Updated athlete: {athlete_create.uid}")
                    elif existing_athlete.person_id != person_id:
                        # Even if no other changes, ensure person_id is set
                        existing_athlete.person_id = person_id
                        self.session.add(existing_athlete)
                    the_athlete = existing_athlete
                else:
                    # Create new athlete
                    new_athlete = Athlete(**athlete_create.model_dump())
                    new_athlete.person_id = person_id
                    self.session.add(new_athlete)
                    self.session.flush()
                    created += 1
                    logger.info(f"Created new athlete: {athlete_create.uid}")
                    the_athlete = new_athlete

                if source:
                    from ..domain.entities.athlete_source_uid import AthleteSourceUid
                    existing_map = self.session.exec(
                        select(AthleteSourceUid).where(
                            AthleteSourceUid.arena_source_id == source.id,
                            AthleteSourceUid.arena_uuid == athlete_create.uid,
                        )
                    ).first()
                    if not existing_map:
                        self.session.add(AthleteSourceUid(
                            athlete_id=the_athlete.id,
                            arena_source_id=source.id,
                            arena_uuid=athlete_create.uid,
                        ))
                        self.session.flush()

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
