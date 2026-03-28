"""Ranking service - computes wrestler rankings per weight category"""
from collections import defaultdict
from sqlmodel import Session, select, col
from typing import Optional, List

from ..domain.entities.fight import Fight
from ..domain.entities.athlete import Athlete
from ..domain.entities.sport_event import SportEvent
from ..domain.entities.person import Person
from ..domain.entities.weight_category import WeightCategory

# Victory type bonus points
VICTORY_BONUS = {
    "VFA": 5, "VFA1": 5,           # fall / pin
    "VSU": 3, "VSU1": 3,           # technical superiority
    "VPO": 1, "VPO1": 1,           # on points
    "VIN": 2, "VFO": 2, "VCA": 2,  # injury/forfeit/other
    "VBD": 2, "VBS": 2,
    "DSQ": 0, "2DSQ": 0, "2VIN": 0,
}

RECENCY_WEIGHTS = [1.0, 0.7, 0.4, 0.2, 0.1]


class RankingService:
    def __init__(self, session: Session):
        self.session = session

    def get_available_weight_categories(self) -> list[str]:
        """Return distinct weight category names (built from max_weight) that have fights."""
        stmt = (
            select(WeightCategory.max_weight)
            .join(Fight, Fight.weight_category_id == WeightCategory.id)
            .where(WeightCategory.max_weight.is_not(None))  # type: ignore
            .distinct()
            .order_by(WeightCategory.max_weight)
        )
        return [f"{mw} kg" for mw in self.session.exec(stmt).all()]

    def get_ranking(self, weight_category_name: str, last_n: int = 3, date_from: Optional[str] = None) -> list[dict]:
        """Compute ranking for a weight category using last_n most recent tournaments."""
        # Collect all fights in this weight category that have both fighters resolved
        fights = self._get_fights_for_category(weight_category_name, date_from)
        if not fights:
            return []

        # Group fights by (person_id, sport_event_id)
        # Each entry: list of dicts with fight info
        person_events: dict[int, dict[int, list[dict]]] = defaultdict(lambda: defaultdict(list))
        person_info: dict[int, dict] = {}
        event_info: dict[int, dict] = {}

        for f in fights:
            # Process fighter one
            if f["person1_id"]:
                person_events[f["person1_id"]][f["sport_event_id"]].append({
                    "is_winner": f["winner_athlete_id"] == f["fighter_one_id"],
                    "victory_type": f["victory_type"] if f["winner_athlete_id"] == f["fighter_one_id"] else None,
                })
                if f["person1_id"] not in person_info:
                    person_info[f["person1_id"]] = {
                        "full_name": f["person1_name"],
                        "country_iso_code": f["person1_country"],
                    }
            # Process fighter two
            if f["person2_id"]:
                person_events[f["person2_id"]][f["sport_event_id"]].append({
                    "is_winner": f["winner_athlete_id"] == f["fighter_two_id"],
                    "victory_type": f["victory_type"] if f["winner_athlete_id"] == f["fighter_two_id"] else None,
                })
                if f["person2_id"] not in person_info:
                    person_info[f["person2_id"]] = {
                        "full_name": f["person2_name"],
                        "country_iso_code": f["person2_country"],
                    }

            if f["sport_event_id"] not in event_info:
                event_info[f["sport_event_id"]] = {
                    "event_name": f["event_name"],
                    "start_date": f["start_date"],
                }

        # Compute scores per person
        rankings = []
        for person_id, events in person_events.items():
            # Sort events by start_date descending (most recent first)
            sorted_event_ids = sorted(
                events.keys(),
                key=lambda eid: event_info[eid]["start_date"] or "",
                reverse=True,
            )
            # Take only last_n most recent
            counted_events = sorted_event_ids[:last_n]

            total_score = 0.0
            total_wins = 0
            total_fights = 0
            breakdown = []

            for i, eid in enumerate(counted_events):
                fight_list = events[eid]
                wins = sum(1 for f in fight_list if f["is_winner"])
                n_fights = len(fight_list)
                total_wins += wins
                total_fights += n_fights

                # performance_points = (wins / total_fights) * 20
                perf_pts = (wins / n_fights) * 20 if n_fights > 0 else 0.0

                # victory_bonus = sum of bonuses for each win
                vic_bonus = 0.0
                for f in fight_list:
                    if f["is_winner"] and f["victory_type"]:
                        vtype = f["victory_type"].strip().upper()
                        vic_bonus += VICTORY_BONUS.get(vtype, 2)

                tournament_score = perf_pts + vic_bonus
                weight = RECENCY_WEIGHTS[i] if i < len(RECENCY_WEIGHTS) else 0.1
                weighted = tournament_score * weight

                total_score += weighted
                breakdown.append({
                    "event_name": event_info[eid]["event_name"],
                    "start_date": event_info[eid]["start_date"],
                    "wins": wins,
                    "total_fights": n_fights,
                    "performance_points": round(perf_pts, 2),
                    "victory_bonus": round(vic_bonus, 2),
                    "tournament_score": round(tournament_score, 2),
                    "recency_weight": weight,
                    "weighted_score": round(weighted, 2),
                })

            rankings.append({
                "person_id": person_id,
                "full_name": person_info[person_id]["full_name"],
                "country_iso_code": person_info[person_id]["country_iso_code"],
                "total_score": round(total_score, 2),
                "tournaments_counted": len(counted_events),
                "total_wins": total_wins,
                "total_fights": total_fights,
                "breakdown": breakdown,
            })

        # Sort by total_score descending
        rankings.sort(key=lambda r: r["total_score"], reverse=True)

        # Add rank
        for i, r in enumerate(rankings):
            r["rank"] = i + 1

        return rankings

    def _get_fights_for_category(self, weight_category_name: str, date_from: Optional[str] = None) -> list[dict]:
        # Parse "65 kg" → 65
        try:
            max_weight = int(weight_category_name.replace(" kg", "").strip())
        except ValueError:
            return []
        """Get all fights for a weight category with person info resolved via athletes."""
        a1 = Athlete.__table__.alias("a1")
        a2 = Athlete.__table__.alias("a2")
        p1 = Person.__table__.alias("p1")
        p2 = Person.__table__.alias("p2")

        from sqlalchemy import select as sa_select, and_

        wc = WeightCategory.__table__.alias("wc")

        stmt = (
            sa_select(
                Fight.id,
                Fight.sport_event_id,
                Fight.victory_type,
                Fight.fighter_one_id,
                Fight.fighter_two_id,
                Fight.winner_id.label("winner_athlete_id"),
                a1.c.person_id.label("person1_id"),
                a2.c.person_id.label("person2_id"),
                p1.c.full_name.label("person1_name"),
                p1.c.country_iso_code.label("person1_country"),
                p2.c.full_name.label("person2_name"),
                p2.c.country_iso_code.label("person2_country"),
                SportEvent.name.label("event_name"),
                SportEvent.start_date,
            )
            .select_from(Fight.__table__)
            .join(SportEvent.__table__, SportEvent.id == Fight.sport_event_id)
            .join(wc, wc.c.id == Fight.weight_category_id)
            .join(a1, a1.c.id == Fight.fighter_one_id)
            .join(a2, a2.c.id == Fight.fighter_two_id)
            .join(p1, p1.c.id == a1.c.person_id)
            .join(p2, p2.c.id == a2.c.person_id)
            .where(wc.c.max_weight == max_weight)
            .where(Fight.fighter_one_id.is_not(None))  # type: ignore
            .where(Fight.fighter_two_id.is_not(None))  # type: ignore
        )

        if date_from:
            stmt = stmt.where(SportEvent.__table__.c.start_date >= date_from)

        rows = self.session.exec(stmt).all()  # type: ignore
        return [dict(row._mapping) for row in rows]
