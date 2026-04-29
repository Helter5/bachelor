"""Service for person-centric queries used by the public API."""
from fastapi import HTTPException, status
from sqlmodel import Session, select, or_, and_, col, func

from ..domain.entities.athlete import Athlete
from ..domain.entities.fight import Fight
from ..domain.entities.person import Person
from ..domain.entities.sport_event import SportEvent
from ..domain.entities.team import Team
from ..domain.entities.weight_category import WeightCategory
from ..domain.schemas.responses import PersonOut
from .base_service import BaseService


class PersonService(BaseService[Person]):
    """Encapsulates query logic for person listings and details."""

    def __init__(self, session: Session):
        super().__init__(session, Person)

    def list_persons(
        self,
        *,
        name: str | None = None,
        country: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[PersonOut]:
        """Return persons that are real athletes, enriched with fight counts."""
        fight_count_sub = (
            select(
                col(Athlete.person_id).label("person_id"),
                func.count(Fight.id).label("fight_count"),
            )
            .join(Fight, or_(
                Fight.fighter_one_id == Athlete.id,
                Fight.fighter_two_id == Athlete.id,
            ))
            .where(col(Athlete.person_id).is_not(None))
            .group_by(col(Athlete.person_id))
            .subquery()
        )

        athlete_persons_sub = (
            select(
                col(Athlete.person_id).label("person_id"),
                func.count(func.distinct(Athlete.sport_event_id)).label("tournament_count"),
            )
            .where(col(Athlete.person_id).is_not(None))
            .group_by(col(Athlete.person_id))
            .subquery()
        )

        statement = (
            select(
                Person,
                func.coalesce(fight_count_sub.c.fight_count, 0).label("fight_count"),
                func.coalesce(athlete_persons_sub.c.tournament_count, 0).label("tournament_count"),
            )
            .join(athlete_persons_sub, Person.id == athlete_persons_sub.c.person_id)
            .outerjoin(fight_count_sub, Person.id == fight_count_sub.c.person_id)
        )

        if name:
            statement = statement.where(
                or_(
                    Person.first_name.ilike(f"%{name}%"),
                    Person.last_name.ilike(f"%{name}%"),
                )
            )
        if country:
            statement = statement.where(Person.country_iso_code == country.upper())

        rows = self.session.exec(
            statement.order_by(Person.last_name, Person.first_name).offset(skip).limit(limit)
        ).all()

        result = []
        for person, fight_count, tournament_count in rows:
            item = PersonOut.model_validate(person, from_attributes=True)
            item.fight_count = int(fight_count or 0)
            item.tournament_count = int(tournament_count or 0)
            result.append(item)

        return result

    def compare_persons(
        self,
        *,
        person1_id: int,
        person2_id: int,
        include_fights: bool = False,
        include_common_opponents: bool = False,
    ) -> dict:
        """Compare two wrestlers head-to-head across all events."""
        person1 = self._get_required_person(person1_id)
        person2 = self._get_required_person(person2_id)

        p1_athlete_ids = self._get_person_athlete_ids(person1_id)
        p2_athlete_ids = self._get_person_athlete_ids(person2_id)

        if not p1_athlete_ids or not p2_athlete_ids:
            return {
                "person1": {"id": person1.id, "name": person1.full_name, "country": person1.country_iso_code},
                "person2": {"id": person2.id, "name": person2.full_name, "country": person2.country_iso_code},
                "total_fights": 0,
                "person1_wins": 0,
                "person2_wins": 0,
                "fights": [],
            }

        p1_set = set(p1_athlete_ids)
        p2_set = set(p2_athlete_ids)
        person1_wins = 0
        person2_wins = 0
        fight_list = []

        if include_fights:
            fights = self.session.exec(
                select(Fight).where(or_(
                    and_(Fight.fighter_one_id.in_(p1_athlete_ids), Fight.fighter_two_id.in_(p2_athlete_ids)),
                    and_(Fight.fighter_one_id.in_(p2_athlete_ids), Fight.fighter_two_id.in_(p1_athlete_ids)),
                ))
            ).all()

            events = self._batch_events(list({fight.sport_event_id for fight in fights}))
            wcs = self._batch_weight_categories(
                list({fight.weight_category_id for fight in fights if fight.weight_category_id})
            )

            for fight in fights:
                p1_is_fighter_one = fight.fighter_one_id in p1_set
                p1_tp = fight.tp_one if p1_is_fighter_one else fight.tp_two
                p2_tp = fight.tp_two if p1_is_fighter_one else fight.tp_one
                p1_cp = fight.cp_one if p1_is_fighter_one else fight.cp_two
                p2_cp = fight.cp_two if p1_is_fighter_one else fight.cp_one

                winner = None
                winner_name = None
                if fight.winner_id:
                    if fight.winner_id in p1_set:
                        winner, winner_name = "person1", person1.full_name
                        person1_wins += 1
                    elif fight.winner_id in p2_set:
                        winner, winner_name = "person2", person2.full_name
                        person2_wins += 1

                event = events.get(fight.sport_event_id)
                wc = wcs.get(fight.weight_category_id) if fight.weight_category_id else None

                fight_list.append({
                    "fight_id": fight.id,
                    "sport_event_name": event.name if event else None,
                    "discipline": wc.name if wc else None,
                    "weight_category": wc.name if wc else None,
                    "person1_name": person1.full_name,
                    "person2_name": person2.full_name,
                    "person1_tp": p1_tp,
                    "person2_tp": p2_tp,
                    "person1_cp": p1_cp,
                    "person2_cp": p2_cp,
                    "victory_type": fight.victory_type,
                    "duration": fight.duration,
                    "winner": winner,
                    "winner_name": winner_name,
                })

        result = {
            "person1": {"id": person1.id, "name": person1.full_name, "country": person1.country_iso_code},
            "person2": {"id": person2.id, "name": person2.full_name, "country": person2.country_iso_code},
            "total_fights": len(fight_list),
            "person1_wins": person1_wins,
            "person2_wins": person2_wins,
            "fights": fight_list,
        }

        if include_common_opponents:
            result["common_opponents"] = self._build_common_opponents(
                person1,
                person2,
                p1_athlete_ids,
                p2_athlete_ids,
            )

        return result

    def get_person_opponents(self, person_id: int) -> list[dict]:
        """Return all persons who have fought against this person."""
        self._get_required_person(person_id)
        athlete_ids = self._get_person_athlete_ids(person_id)
        if not athlete_ids:
            return []

        opponent_persons = self._get_opponent_persons(person_id, athlete_ids)
        return sorted(
            [{"id": person.id, "full_name": person.full_name, "country_iso_code": person.country_iso_code} for person in opponent_persons.values()],
            key=lambda item: item["full_name"] or "",
        )

    def get_common_opponent_candidates(self, person_id: int) -> list[dict]:
        """Return persons who share at least one common opponent with this person."""
        self._get_required_person(person_id)
        athlete_ids = self._get_person_athlete_ids(person_id)
        if not athlete_ids:
            return []

        athlete_id_set = set(athlete_ids)
        fights = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(athlete_ids),
            Fight.fighter_two_id.in_(athlete_ids),
        ))).all()

        opponent_athlete_ids: set[int] = set()
        for fight in fights:
            if fight.fighter_one_id in athlete_id_set and fight.fighter_two_id:
                opponent_athlete_ids.add(fight.fighter_two_id)
            elif fight.fighter_two_id in athlete_id_set and fight.fighter_one_id:
                opponent_athlete_ids.add(fight.fighter_one_id)

        if not opponent_athlete_ids:
            return []

        fights2 = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(list(opponent_athlete_ids)),
            Fight.fighter_two_id.in_(list(opponent_athlete_ids)),
        ))).all()

        candidate_athlete_ids: set[int] = set()
        for fight in fights2:
            if fight.fighter_one_id is not None and fight.fighter_one_id not in athlete_id_set:
                candidate_athlete_ids.add(fight.fighter_one_id)
            if fight.fighter_two_id is not None and fight.fighter_two_id not in athlete_id_set:
                candidate_athlete_ids.add(fight.fighter_two_id)

        if not candidate_athlete_ids:
            return []

        candidate_person_ids = list({
            athlete.person_id
            for athlete in self._batch_athletes(list(candidate_athlete_ids)).values()
            if athlete.person_id
        } - {person_id})
        candidate_persons = self._batch_persons(candidate_person_ids)

        return sorted(
            [{"id": person.id, "full_name": person.full_name, "country_iso_code": person.country_iso_code} for person in candidate_persons.values()],
            key=lambda item: item["full_name"] or "",
        )

    def get_person_detail(self, person_id: int) -> dict:
        """Return person profile with distinct event participations."""
        person = self._get_required_person(person_id)
        athletes = self.session.exec(select(Athlete).where(Athlete.person_id == person_id)).all()

        events = self._batch_events(list({athlete.sport_event_id for athlete in athletes}))
        teams = self._batch_teams(list({athlete.team_id for athlete in athletes if athlete.team_id}))
        wcs = self._batch_weight_categories(
            list({athlete.weight_category_id for athlete in athletes if athlete.weight_category_id})
        )

        seen_event_ids: set[int] = set()
        events_list = []
        for athlete in athletes:
            if athlete.sport_event_id in seen_event_ids:
                continue
            seen_event_ids.add(athlete.sport_event_id)
            event = events.get(athlete.sport_event_id)
            team = teams.get(athlete.team_id) if athlete.team_id else None
            wc = wcs.get(athlete.weight_category_id) if athlete.weight_category_id else None
            events_list.append({
                "athlete_id": athlete.id,
                "event_id": athlete.sport_event_id,
                "event_name": event.name if event else None,
                "team_name": team.name if team else None,
                "team_country": team.country_iso_code if team else None,
                "weight_category": wc.name if wc else None,
                "is_competing": athlete.is_competing,
            })

        return {
            "id": person.id,
            "full_name": person.full_name,
            "country_iso_code": person.country_iso_code,
            "created_at": person.created_at,
            "events": events_list,
        }

    def get_person_fights(self, person_id: int) -> dict:
        """Return all fights for a person with opponent details."""
        person = self._get_required_person(person_id)
        athlete_ids = self._get_person_athlete_ids(person_id)
        if not athlete_ids:
            return {"person": person.full_name, "fights": []}

        fights = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(athlete_ids),
            Fight.fighter_two_id.in_(athlete_ids),
        ))).all()

        events = self._batch_events(list({fight.sport_event_id for fight in fights}))
        wcs = self._batch_weight_categories(
            list({fight.weight_category_id for fight in fights if fight.weight_category_id})
        )

        athlete_id_set = set(athlete_ids)
        opponent_athlete_ids = set()
        for fight in fights:
            if fight.fighter_one_id in athlete_id_set and fight.fighter_two_id:
                opponent_athlete_ids.add(fight.fighter_two_id)
            elif fight.fighter_two_id in athlete_id_set and fight.fighter_one_id:
                opponent_athlete_ids.add(fight.fighter_one_id)

        opp_athletes = self._batch_athletes(list(opponent_athlete_ids))
        opp_persons = self._batch_persons(
            list({athlete.person_id for athlete in opp_athletes.values() if athlete.person_id})
        )

        fight_list = []
        for fight in fights:
            event = events.get(fight.sport_event_id)
            wc = wcs.get(fight.weight_category_id) if fight.weight_category_id else None

            is_fighter_one = fight.fighter_one_id in athlete_id_set
            opp_athlete_id = fight.fighter_two_id if is_fighter_one else fight.fighter_one_id
            opp_athlete = opp_athletes.get(opp_athlete_id) if opp_athlete_id else None
            opp_person = opp_persons.get(opp_athlete.person_id) if opp_athlete and opp_athlete.person_id else None

            fight_list.append({
                "fight_id": fight.id,
                "event_name": event.name if event else None,
                "weight_category": wc.name if wc else None,
                "opponent": opp_person.full_name if opp_person else None,
                "is_winner": fight.winner_id in athlete_id_set if fight.winner_id is not None else None,
                "victory_type": fight.victory_type,
                "tp_self": fight.tp_one if is_fighter_one else fight.tp_two,
                "tp_opponent": fight.tp_two if is_fighter_one else fight.tp_one,
                "cp_self": fight.cp_one if is_fighter_one else fight.cp_two,
                "cp_opponent": fight.cp_two if is_fighter_one else fight.cp_one,
            })

        return {
            "person": person.full_name,
            "country": person.country_iso_code,
            "total_fights": len(fight_list),
            "fights": fight_list,
        }

    def _get_required_person(self, person_id: int) -> Person:
        person = self.session.get(Person, person_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Person {person_id} not found",
            )
        return person

    def _get_person_athlete_ids(self, person_id: int) -> list[int]:
        return [athlete.id for athlete in self.session.exec(
            select(Athlete).where(Athlete.person_id == person_id)
        ).all()]

    def _batch_events(self, ids: list[int]) -> dict[int, SportEvent]:
        if not ids:
            return {}
        rows = self.session.exec(select(SportEvent).where(SportEvent.id.in_(ids))).all()
        return {row.id: row for row in rows}

    def _batch_weight_categories(self, ids: list[int]) -> dict[int, WeightCategory]:
        if not ids:
            return {}
        rows = self.session.exec(select(WeightCategory).where(WeightCategory.id.in_(ids))).all()
        return {row.id: row for row in rows}

    def _batch_teams(self, ids: list[int]) -> dict[int, Team]:
        if not ids:
            return {}
        rows = self.session.exec(select(Team).where(Team.id.in_(ids))).all()
        return {row.id: row for row in rows}

    def _batch_athletes(self, ids: list[int]) -> dict[int, Athlete]:
        if not ids:
            return {}
        rows = self.session.exec(select(Athlete).where(Athlete.id.in_(ids))).all()
        return {row.id: row for row in rows}

    def _batch_persons(self, ids: list[int]) -> dict[int, Person]:
        if not ids:
            return {}
        rows = self.session.exec(select(Person).where(Person.id.in_(ids))).all()
        return {row.id: row for row in rows}

    def _get_opponent_persons(self, person_id: int, athlete_ids: list[int]) -> dict[int, Person]:
        athlete_id_set = set(athlete_ids)
        fights = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(athlete_ids),
            Fight.fighter_two_id.in_(athlete_ids),
        ))).all()

        opponent_athlete_ids: set[int] = set()
        for fight in fights:
            if fight.fighter_one_id in athlete_id_set and fight.fighter_two_id:
                opponent_athlete_ids.add(fight.fighter_two_id)
            elif fight.fighter_two_id in athlete_id_set and fight.fighter_one_id:
                opponent_athlete_ids.add(fight.fighter_one_id)

        if not opponent_athlete_ids:
            return {}

        opp_athletes = self._batch_athletes(list(opponent_athlete_ids))
        opp_person_ids = list({athlete.person_id for athlete in opp_athletes.values() if athlete.person_id} - {person_id})
        return self._batch_persons(opp_person_ids)

    def _build_common_opponents(
        self,
        person1: Person,
        person2: Person,
        p1_athlete_ids: list[int],
        p2_athlete_ids: list[int],
    ) -> list[dict]:
        p1_fights = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(p1_athlete_ids),
            Fight.fighter_two_id.in_(p1_athlete_ids),
        ))).all()
        p2_fights = self.session.exec(select(Fight).where(or_(
            Fight.fighter_one_id.in_(p2_athlete_ids),
            Fight.fighter_two_id.in_(p2_athlete_ids),
        ))).all()

        def get_opponent_person_ids(fights_list: list[Fight], my_athlete_ids: set[int]) -> set[int]:
            opp_athlete_ids = set()
            for fight in fights_list:
                if fight.fighter_one_id in my_athlete_ids and fight.fighter_two_id:
                    opp_athlete_ids.add(fight.fighter_two_id)
                elif fight.fighter_two_id in my_athlete_ids and fight.fighter_one_id:
                    opp_athlete_ids.add(fight.fighter_one_id)
            athletes = self._batch_athletes(list(opp_athlete_ids))
            return {athlete.person_id for athlete in athletes.values() if athlete.person_id}

        p1_opponent_persons = get_opponent_person_ids(p1_fights, set(p1_athlete_ids))
        p2_opponent_persons = get_opponent_person_ids(p2_fights, set(p2_athlete_ids))
        common_person_ids = (p1_opponent_persons & p2_opponent_persons) - {person1.id, person2.id}

        opp_persons = self._batch_persons(list(common_person_ids))
        opp_athletes_by_person: dict[int, list[int]] = {}
        if common_person_ids:
            all_opp_athletes = self.session.exec(
                select(Athlete).where(Athlete.person_id.in_(common_person_ids))
            ).all()
            for athlete in all_opp_athletes:
                opp_athletes_by_person.setdefault(athlete.person_id, []).append(athlete.id)

        common_opponents = []
        for opp_person_id in common_person_ids:
            opp_person = opp_persons.get(opp_person_id)
            if not opp_person:
                continue

            opp_athlete_ids = opp_athletes_by_person.get(opp_person_id, [])
            if not opp_athlete_ids:
                continue

            p1_vs_opp = self.session.exec(select(Fight).where(or_(
                and_(Fight.fighter_one_id.in_(p1_athlete_ids), Fight.fighter_two_id.in_(opp_athlete_ids)),
                and_(Fight.fighter_one_id.in_(opp_athlete_ids), Fight.fighter_two_id.in_(p1_athlete_ids)),
            ))).all()
            p2_vs_opp = self.session.exec(select(Fight).where(or_(
                and_(Fight.fighter_one_id.in_(p2_athlete_ids), Fight.fighter_two_id.in_(opp_athlete_ids)),
                and_(Fight.fighter_one_id.in_(opp_athlete_ids), Fight.fighter_two_id.in_(p2_athlete_ids)),
            ))).all()

            all_vs_fights = p1_vs_opp + p2_vs_opp
            vs_events = self._batch_events(list({fight.sport_event_id for fight in all_vs_fights}))
            vs_wcs = self._batch_weight_categories(
                list({fight.weight_category_id for fight in all_vs_fights if fight.weight_category_id})
            )

            p1_fights_info = [
                self._build_fight_info(fight, set(p1_athlete_ids), person1.full_name, opp_person.full_name, vs_events, vs_wcs)
                for fight in p1_vs_opp
            ]
            p2_fights_info = [
                self._build_fight_info(fight, set(p2_athlete_ids), person2.full_name, opp_person.full_name, vs_events, vs_wcs)
                for fight in p2_vs_opp
            ]

            common_opponents.append({
                "opponent": {"id": opp_person.id, "name": opp_person.full_name, "country": opp_person.country_iso_code},
                "person1_fights": p1_fights_info,
                "person1_summary": self._build_summary(p1_fights_info),
                "person2_fights": p2_fights_info,
                "person2_summary": self._build_summary(p2_fights_info),
            })

        return common_opponents

    @staticmethod
    def _build_fight_info(
        fight: Fight,
        my_athlete_ids_set: set[int],
        my_person_name: str,
        opp_person_name: str,
        events_map: dict[int, SportEvent],
        wcs_map: dict[int, WeightCategory],
    ) -> dict:
        my_is_one = fight.fighter_one_id in my_athlete_ids_set
        w_tp = fight.tp_one if my_is_one else fight.tp_two
        o_tp = fight.tp_two if my_is_one else fight.tp_one
        w_cp = fight.cp_one if my_is_one else fight.cp_two
        o_cp = fight.cp_two if my_is_one else fight.cp_one
        event = events_map.get(fight.sport_event_id)
        wc = wcs_map.get(fight.weight_category_id) if fight.weight_category_id else None
        return {
            "fight_id": fight.id,
            "sport_event_name": event.name if event else None,
            "discipline": wc.name if wc else None,
            "weight_category": wc.name if wc else None,
            "wrestler_name": my_person_name,
            "opponent_name": opp_person_name,
            "wrestler_tp": w_tp,
            "opponent_tp": o_tp,
            "tp_diff": (w_tp or 0) - (o_tp or 0),
            "wrestler_cp": w_cp,
            "opponent_cp": o_cp,
            "cp_diff": (w_cp or 0) - (o_cp or 0),
            "victory_type": fight.victory_type,
            "duration": fight.duration,
            "won": fight.winner_id in my_athlete_ids_set if fight.winner_id else None,
        }

    @staticmethod
    def _build_summary(fights_info: list[dict]) -> dict:
        total = len(fights_info)
        if not total:
            return {}

        wins = sum(1 for fight in fights_info if fight["won"] is True)
        losses = sum(1 for fight in fights_info if fight["won"] is False)
        victory_types: dict[str, int] = {}
        for fight in fights_info:
            if fight["won"] is True and fight["victory_type"]:
                victory_types[fight["victory_type"]] = victory_types.get(fight["victory_type"], 0) + 1

        return {
            "wins": wins,
            "losses": losses,
            "avg_tp": round(sum(fight["wrestler_tp"] or 0 for fight in fights_info) / total, 1),
            "avg_cp": round(sum(fight["wrestler_cp"] or 0 for fight in fights_info) / total, 1),
            "avg_tp_diff": round(sum(fight["tp_diff"] for fight in fights_info) / total, 1),
            "avg_cp_diff": round(sum(fight["cp_diff"] for fight in fights_info) / total, 1),
            "wins_by_type": victory_types,
        }
