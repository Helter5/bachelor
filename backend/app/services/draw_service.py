"""
Draw Service
Generates seeded tournament brackets with penalty-based optimization.
"""
from sqlmodel import Session, select
from sqlalchemy import select as sa_select, func, and_
from typing import Optional
import math
import logging

from ..domain.entities.athlete import Athlete
from ..domain.entities.person import Person
from ..domain.entities.team import Team
from ..domain.entities.fight import Fight
from ..domain.entities.sport_event import SportEvent
from ..domain.entities.weight_category import WeightCategory

logger = logging.getLogger(__name__)

SAME_TEAM_PENALTY = 50
FIGHT_HISTORY_PENALTY = 10
RECENT_FIGHT_PENALTY = 20
RECENCY_WEIGHTS = [1.0, 0.7, 0.4, 0.2, 0.1]


class DrawService:
    def __init__(self, session: Session):
        self.session = session

    def generate_draw(self, event_id: int, weight_category_id: int, last_n: int = 3) -> dict:
        athletes = self._get_athletes(event_id, weight_category_id)
        if not athletes:
            return {"error": "Žiadni atléti v tejto váhovej kategórii"}

        wc = self.session.get(WeightCategory, weight_category_id)
        wc_name = f"{wc.max_weight} kg" if wc else str(weight_category_id)

        # Score each athlete for seeding
        for a in athletes:
            a["score"] = self._compute_seed_score(a["person_id"], wc.max_weight if wc else None, last_n)
        athletes.sort(key=lambda x: x["score"], reverse=True)
        for i, a in enumerate(athletes):
            a["seed"] = i + 1

        n = len(athletes)
        bracket_size = self._next_power_of_2(n)
        byes = bracket_size - n

        # Assign fixed seed positions in the bracket
        slots: list[Optional[dict]] = [None] * bracket_size
        seed_positions = self._seed_positions(bracket_size)

        for i, athlete in enumerate(athletes):
            if i < len(seed_positions):
                slots[seed_positions[i]] = athlete

        # Remaining athletes go to empty slots with penalty optimization
        placed = set(seed_positions[:n])
        unseeded = [a for a in athletes if a["seed"] > len(seed_positions)]
        empty_slots = [i for i in range(bracket_size) if i not in placed and slots[i] is None]

        self._place_with_penalty_opt(slots, unseeded, empty_slots, last_n)

        # Build first-round match pairs
        bracket = []
        for i in range(bracket_size // 2):
            a = slots[i * 2]
            b = slots[i * 2 + 1]
            penalty, reasons = self._compute_pair_penalty(a, b, last_n) if (a and b) else (0, [])
            bracket.append({
                "match_number": i + 1,
                "athlete_a": self._format_athlete(a),
                "athlete_b": self._format_athlete(b),
                "penalty_score": penalty,
                "penalty_reasons": reasons,
            })

        total_penalty = sum(m["penalty_score"] for m in bracket)

        return {
            "event_id": event_id,
            "weight_category_id": weight_category_id,
            "weight_category_name": wc_name,
            "athletes_count": n,
            "bracket_size": bracket_size,
            "byes_count": byes,
            "last_n_tournaments": last_n,
            "total_penalty": total_penalty,
            "seeding": [
                {
                    "seed": a["seed"],
                    "person_id": a["person_id"],
                    "full_name": a["full_name"],
                    "country_iso_code": a["country_iso_code"],
                    "team_name": a["team_name"],
                    "score": round(a["score"], 2),
                }
                for a in athletes
            ],
            "bracket": bracket,
        }

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    def _get_athletes(self, event_id: int, weight_category_id: int) -> list[dict]:
        rows = self.session.exec(
            select(Athlete, Person, Team)
            .join(Person, Athlete.person_id == Person.id, isouter=True)
            .join(Team, Athlete.team_id == Team.id, isouter=True)
            .where(Athlete.sport_event_id == event_id)
            .where(Athlete.weight_category_id == weight_category_id)
        ).all()

        result = []
        for athlete, person, team in rows:
            if not person:
                continue
            result.append({
                "athlete_id": athlete.id,
                "person_id": person.id,
                "full_name": person.full_name,
                "country_iso_code": person.country_iso_code,
                "team_id": athlete.team_id,
                "team_name": team.name if team else None,
            })
        return result

    def _compute_seed_score(self, person_id: int, max_weight: Optional[int], last_n: int) -> float:
        """Score athlete based on wins in recent tournaments at this weight."""
        a1 = Athlete.__table__.alias("a1")
        p1 = Person.__table__.alias("p1")
        wc = WeightCategory.__table__

        stmt = (
            sa_select(
                Fight.sport_event_id,
                Fight.winner_id,
                Fight.fighter_one_id,
                Fight.fighter_two_id,
                SportEvent.start_date,
            )
            .join(SportEvent.__table__, SportEvent.id == Fight.sport_event_id)
            .join(wc, wc.c.id == Fight.weight_category_id)
            .join(a1, a1.c.id == Fight.fighter_one_id)
            .join(p1, p1.c.id == a1.c.person_id)
            .where(p1.c.id == person_id)
        )
        if max_weight is not None:
            stmt = stmt.where(wc.c.max_weight == max_weight)

        rows = self.session.exec(stmt).all()  # type: ignore
        if not rows:
            # Also check as fighter two
            a2 = Athlete.__table__.alias("a2")
            p2 = Person.__table__.alias("p2")
            stmt2 = (
                sa_select(
                    Fight.sport_event_id,
                    Fight.winner_id,
                    Fight.fighter_one_id,
                    Fight.fighter_two_id,
                    SportEvent.start_date,
                )
                .join(SportEvent.__table__, SportEvent.id == Fight.sport_event_id)
                .join(wc, wc.c.id == Fight.weight_category_id)
                .join(a2, a2.c.id == Fight.fighter_two_id)
                .join(p2, p2.c.id == a2.c.person_id)
                .where(p2.c.id == person_id)
            )
            if max_weight is not None:
                stmt2 = stmt2.where(wc.c.max_weight == max_weight)
            rows = self.session.exec(stmt2).all()  # type: ignore

        if not rows:
            return 0.0

        # Group by event, sort by date desc, take last_n
        from collections import defaultdict
        event_fights: dict[int, list] = defaultdict(list)
        event_dates: dict[int, str] = {}
        for r in rows:
            row = dict(r._mapping) if hasattr(r, "_mapping") else r._asdict()
            eid = row["sport_event_id"]
            event_fights[eid].append(row)
            event_dates[eid] = row["start_date"] or ""

        sorted_events = sorted(event_dates.keys(), key=lambda e: event_dates[e], reverse=True)[:last_n]

        score = 0.0
        for i, eid in enumerate(sorted_events):
            fights = event_fights[eid]
            wins = 0
            for f in fights:
                row = dict(f._mapping) if hasattr(f, "_mapping") else f
                # winner_id is athlete_id; we matched by person so check fighter slots
                if row.get("winner_id") == row.get("fighter_one_id") or row.get("winner_id") == row.get("fighter_two_id"):
                    wins += 1
            weight = RECENCY_WEIGHTS[i] if i < len(RECENCY_WEIGHTS) else 0.1
            score += wins * 20 * weight

        return score

    def _compute_pair_penalty(self, a: Optional[dict], b: Optional[dict], last_n: int) -> tuple[int, list[str]]:
        if not a or not b:
            return 0, []
        penalty = 0
        reasons = []

        # Same team
        if a["team_id"] and b["team_id"] and a["team_id"] == b["team_id"]:
            penalty += SAME_TEAM_PENALTY
            reasons.append(f"Rovnaký tím ({a['team_name']}): +{SAME_TEAM_PENALTY}")

        # Fight history
        total, recent = self._count_fights_between(a["person_id"], b["person_id"], last_n)
        if total > 0:
            p = total * FIGHT_HISTORY_PENALTY
            penalty += p
            reasons.append(f"Predošlé stretnutia celkovo ({total}×): +{p}")
        if recent > 0:
            p = recent * RECENT_FIGHT_PENALTY
            penalty += p
            reasons.append(f"Stretnutia za posledných {last_n} turnajov ({recent}×): +{p}")

        return penalty, reasons

    def _count_fights_between(self, person1_id: int, person2_id: int, last_n: int) -> tuple[int, int]:
        """Returns (total_fights, recent_fights_in_last_n_events)."""
        a1 = Athlete.__table__.alias("a1")
        a2 = Athlete.__table__.alias("a2")
        p1 = Person.__table__.alias("p1")
        p2 = Person.__table__.alias("p2")

        stmt = (
            sa_select(Fight.id, SportEvent.start_date)
            .join(SportEvent.__table__, SportEvent.id == Fight.sport_event_id)
            .join(a1, a1.c.id == Fight.fighter_one_id)
            .join(a2, a2.c.id == Fight.fighter_two_id)
            .join(p1, p1.c.id == a1.c.person_id)
            .join(p2, p2.c.id == a2.c.person_id)
            .where(
                (
                    (p1.c.id == person1_id) & (p2.c.id == person2_id)
                ) | (
                    (p1.c.id == person2_id) & (p2.c.id == person1_id)
                )
            )
            .order_by(SportEvent.__table__.c.start_date.desc())
        )

        rows = self.session.exec(stmt).all()  # type: ignore
        if not rows:
            return 0, 0

        total = len(rows)

        # Count unique recent events (last_n)
        seen_events: set = set()
        recent = 0
        for r in rows:
            row = dict(r._mapping) if hasattr(r, "_mapping") else r._asdict()
            # We don't have event_id directly, approximate via start_date grouping
            date = row.get("start_date", "")
            if len(seen_events) < last_n or date in seen_events:
                seen_events.add(date)
                if len(seen_events) <= last_n:
                    recent += 1

        return total, recent

    def _place_with_penalty_opt(
        self,
        slots: list,
        unseeded: list[dict],
        empty_slots: list[int],
        last_n: int,
    ) -> None:
        """Greedily assign unseeded athletes to slots, minimizing first-round penalty."""
        remaining_athletes = list(unseeded)
        remaining_slots = list(empty_slots)

        while remaining_athletes and remaining_slots:
            best_athlete_idx = 0
            best_slot_idx = 0
            best_penalty = math.inf

            for ai, athlete in enumerate(remaining_athletes):
                for si, slot_idx in enumerate(remaining_slots):
                    # Opponent is the adjacent slot in the first round
                    pair_slot = slot_idx ^ 1  # XOR with 1 gives pair partner
                    opponent = slots[pair_slot]
                    p, _ = self._compute_pair_penalty(athlete, opponent, last_n)
                    if p < best_penalty:
                        best_penalty = p
                        best_athlete_idx = ai
                        best_slot_idx = si

            chosen_athlete = remaining_athletes.pop(best_athlete_idx)
            chosen_slot = remaining_slots.pop(best_slot_idx)
            slots[chosen_slot] = chosen_athlete

    def _seed_positions(self, bracket_size: int) -> list[int]:
        """
        Standard bracket seeding positions.
        Seed 1 and 2 are on opposite sides; 3/4 in opposite quarters, etc.
        """
        if bracket_size == 1:
            return [0]
        positions = []
        positions.append(0)
        positions.append(bracket_size - 1)
        if bracket_size >= 4:
            positions.append(bracket_size // 2 - 1)
            positions.append(bracket_size // 2)
        if bracket_size >= 8:
            positions.append(bracket_size // 4 - 1)
            positions.append(bracket_size // 4)
            positions.append(3 * bracket_size // 4 - 1)
            positions.append(3 * bracket_size // 4)
        if bracket_size >= 16:
            for q in range(8):
                base = q * (bracket_size // 8)
                positions.append(base + bracket_size // 16 - 1)
                positions.append(base + bracket_size // 16)
        return positions[:bracket_size]

    def _next_power_of_2(self, n: int) -> int:
        if n <= 1:
            return 1
        return 1 << math.ceil(math.log2(n))

    def _format_athlete(self, a: Optional[dict]) -> Optional[dict]:
        if not a:
            return None
        return {
            "seed": a["seed"],
            "person_id": a["person_id"],
            "full_name": a["full_name"],
            "country_iso_code": a["country_iso_code"],
            "team_name": a["team_name"],
            "score": round(a["score"], 2),
        }
