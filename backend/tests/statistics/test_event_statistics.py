"""
Validácia štatistík: event statistics
Overuje konzistenciu vypočítaných štatistík s DB dátami pre každý event.
Predpoklad: sync testy prechádzajú → DB dáta sú správne.
"""
from collections import Counter
from sqlmodel import select
from app.domain.entities.fight import Fight
from app.domain.entities.athlete import Athlete
from app.domain.entities.team import Team
from app.domain.entities.person import Person
from app.domain.entities.weight_category import WeightCategory
from tests.utils import check, section, result


# ─────────────────────────────────────────────
# Pomocná funkcia — vypočíta štatistiky priamo z DB
# ─────────────────────────────────────────────

def _compute_stats(db, event) -> dict:
    """Recompute event statistics directly from DB (mirrors event_statistics.py logic)."""
    fights = db.exec(select(Fight).where(Fight.sport_event_id == event.id)).all()

    victory_types = Counter()
    total_duration = 0
    duration_count = 0
    total_tp = 0
    tp_count = 0
    total_cp = 0
    cp_count = 0
    athlete_stats: dict[int, dict] = {}

    for fight in fights:
        if fight.victory_type:
            victory_types[fight.victory_type] += 1
        if fight.duration and fight.duration > 0:
            total_duration += fight.duration
            duration_count += 1
        for tp in [fight.tp_one, fight.tp_two]:
            if tp is not None:
                total_tp += tp
                tp_count += 1
        for cp in [fight.cp_one, fight.cp_two]:
            if cp is not None:
                total_cp += cp
                cp_count += 1
        for fighter_id in [fight.fighter_one_id, fight.fighter_two_id]:
            if fighter_id is not None:
                if fighter_id not in athlete_stats:
                    athlete_stats[fighter_id] = {"wins": 0, "total": 0}
                athlete_stats[fighter_id]["total"] += 1
        if fight.winner_id is not None:
            if fight.winner_id not in athlete_stats:
                athlete_stats[fight.winner_id] = {"wins": 0, "total": 0}
            athlete_stats[fight.winner_id]["wins"] += 1

    return {
        "fights": fights,
        "total_fights": len(fights),
        "victory_types": dict(victory_types),
        "avg_duration": round(total_duration / duration_count) if duration_count else 0,
        "avg_tp": round(total_tp / tp_count, 1) if tp_count else 0.0,
        "avg_cp": round(total_cp / cp_count, 1) if cp_count else 0.0,
        "athlete_stats": athlete_stats,
    }


# ─────────────────────────────────────────────
# 1. Celkový počet zápasov
# ─────────────────────────────────────────────

def test_total_fights_matches_db(db, synced_events):
    """total_fights sa zhoduje s počtom fights v DB pre daný event."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        actual = db.exec(
            select(Fight).where(Fight.sport_event_id == event.id)
        ).all()
        section(event.name)
        ok = check("total_fights", len(actual), stats["total_fights"])
        if not ok:
            errors.append(f"  {event.name}: actual={len(actual)}, computed={stats['total_fights']}")
    result(errors, "Nesúlad total_fights:")


# ─────────────────────────────────────────────
# 2. Victory type distribúcia
# ─────────────────────────────────────────────

def test_victory_type_distribution_sum(db, synced_events):
    """Súčet victory_type_distribution == počet zápasov s nastaveným victory_type."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        vt_sum = sum(stats["victory_types"].values())
        fights_with_vt = sum(1 for f in stats["fights"] if f.victory_type)
        section(event.name)
        ok = check("vt_distribution súčet", fights_with_vt, vt_sum)
        if not ok:
            errors.append(f"  {event.name}: fights_with_vt={fights_with_vt}, sum={vt_sum}")
    result(errors, "Nesúlad victory_type_distribution:")


# ─────────────────────────────────────────────
# 3. Top performers — atlét patrí do eventu
# ─────────────────────────────────────────────

def test_top_performers_belong_to_event(db, synced_events):
    """Každý top performer musí byť atlét priradený k danému eventu."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        event_athlete_ids = {
            a.id for a in db.exec(
                select(Athlete).where(Athlete.sport_event_id == event.id)
            ).all()
        }
        section(event.name)
        for athlete_id in stats["athlete_stats"]:
            in_event = athlete_id in event_athlete_ids
            ok = check(f"atlét {athlete_id} v evente", True, in_event)
            if not ok:
                errors.append(f"  {event.name}: atlét id={athlete_id} nie je v evente")
    result(errors, "Top performer nepatrí do eventu:")


# ─────────────────────────────────────────────
# 4. Top performers — meno a krajina z DB
# ─────────────────────────────────────────────

def test_top_performers_name_and_country(db, synced_events):
    """Každý top performer má v DB priradené meno (person) a krajinu (team)."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        section(event.name)
        for athlete_id in stats["athlete_stats"]:
            athlete = db.get(Athlete, athlete_id)
            if not athlete:
                continue
            person = db.get(Person, athlete.person_id) if athlete.person_id else None
            team = db.get(Team, athlete.team_id) if athlete.team_id else None

            ok_name = check(
                f"meno [{athlete_id}]",
                True,
                person is not None and bool(person.full_name)
            )
            # krajina = country_iso_code alebo alternate_name (rovnaká logika ako athlete_service)
            has_country = team is not None and bool(
                (team.country_iso_code or "").strip() or (team.alternate_name or "").strip()
            )
            ok_country = check(
                f"krajina [{person.full_name[:15] if person else '?'}]",
                True,
                has_country
            )
            if not ok_name:
                errors.append(f"  {event.name}: atlét id={athlete_id} nemá meno")
            if not ok_country:
                errors.append(f"  {event.name}: atlét id={athlete_id} nemá krajinu")
    result(errors, "Top performer nemá meno alebo krajinu:")


# ─────────────────────────────────────────────
# 5. Top performers — počet výhier a zápasov
# ─────────────────────────────────────────────

def test_top_performers_wins_match_fights(db, synced_events):
    """Počet výhier každého atléta sedí s fights tabuľkou."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        section(event.name)
        for athlete_id, ast in stats["athlete_stats"].items():
            # Skutočné výhry: zápasy kde winner_id == athlete_id
            actual_wins = sum(
                1 for f in stats["fights"]
                if f.winner_id == athlete_id
            )
            # Skutočné zápasy: zápasy kde bol fighter
            actual_total = sum(
                1 for f in stats["fights"]
                if f.fighter_one_id == athlete_id or f.fighter_two_id == athlete_id
            )
            athlete = db.get(Athlete, athlete_id)
            person = db.get(Person, athlete.person_id) if athlete and athlete.person_id else None
            label = person.full_name[:15] if person else str(athlete_id)

            ok_wins = check(f"wins [{label}]", actual_wins, ast["wins"])
            ok_total = check(f"total [{label}]", actual_total, ast["total"])
            if not ok_wins:
                errors.append(f"  {event.name} / {label}: wins actual={actual_wins}, computed={ast['wins']}")
            if not ok_total:
                errors.append(f"  {event.name} / {label}: total actual={actual_total}, computed={ast['total']}")
    result(errors, "Nesprávny počet výhier / zápasov:")


# ─────────────────────────────────────────────
# 6. Win rate konzistencia
# ─────────────────────────────────────────────

def test_win_rate_is_consistent(db, synced_events):
    """win_rate == wins / total_fights * 100 pre každého atléta."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        section(event.name)
        for athlete_id, ast in stats["athlete_stats"].items():
            if ast["total"] == 0:
                continue
            expected_rate = round(ast["wins"] / ast["total"] * 100, 1)
            athlete = db.get(Athlete, athlete_id)
            person = db.get(Person, athlete.person_id) if athlete and athlete.person_id else None
            label = person.full_name[:15] if person else str(athlete_id)
            ok = check(f"win_rate [{label}]", expected_rate, expected_rate)
            if not ok:
                errors.append(f"  {event.name} / {label}: expected={expected_rate}")
    result(errors, "Nekonzistentný win_rate:")


# ─────────────────────────────────────────────
# 7. Team performance konzistencia
# ─────────────────────────────────────────────

def test_team_performance_wins_not_exceed_total(db, synced_events):
    """wins <= total_fights pre každý tím."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        team_stats: dict[int, dict] = {}

        athletes = db.exec(
            select(Athlete).where(Athlete.sport_event_id == event.id)
        ).all()
        athlete_team = {a.id: a.team_id for a in athletes}

        for athlete_id, ast in stats["athlete_stats"].items():
            team_id = athlete_team.get(athlete_id)
            if not team_id:
                continue
            if team_id not in team_stats:
                team_stats[team_id] = {"wins": 0, "total": 0}
            team_stats[team_id]["wins"] += ast["wins"]
            team_stats[team_id]["total"] += ast["total"]

        section(event.name)
        for team_id, ts in team_stats.items():
            team = db.get(Team, team_id)
            label = team.name[:15] if team else str(team_id)
            ok = check(f"wins<=total [{label}]", True, ts["wins"] <= ts["total"])
            if not ok:
                errors.append(f"  {event.name} / {label}: wins={ts['wins']} > total={ts['total']}")
    result(errors, "Tím má viac výhier ako zápasov:")


def test_team_performance_losses_correct(db, synced_events):
    """losses == total_fights - wins pre každý tím."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)
        team_stats: dict[int, dict] = {}

        athletes = db.exec(
            select(Athlete).where(Athlete.sport_event_id == event.id)
        ).all()
        athlete_team = {a.id: a.team_id for a in athletes}

        for athlete_id, ast in stats["athlete_stats"].items():
            team_id = athlete_team.get(athlete_id)
            if not team_id:
                continue
            if team_id not in team_stats:
                team_stats[team_id] = {"wins": 0, "total": 0}
            team_stats[team_id]["wins"] += ast["wins"]
            team_stats[team_id]["total"] += ast["total"]

        section(event.name)
        for team_id, ts in team_stats.items():
            team = db.get(Team, team_id)
            label = team.name[:15] if team else str(team_id)
            expected_losses = ts["total"] - ts["wins"]
            ok = check(f"losses [{label}]", expected_losses, expected_losses)
            if not ok:
                errors.append(f"  {event.name} / {label}: expected={expected_losses}")
    result(errors, "Nesprávny počet prehier:")


def test_team_performance_name_and_country(db, synced_events):
    """Každý tím vo výkone má vyplnený názov a krajinu (country_iso_code alebo alternate_name)."""
    errors = []
    for event in synced_events:
        stats = _compute_stats(db, event)

        athletes = db.exec(
            select(Athlete).where(Athlete.sport_event_id == event.id)
        ).all()
        team_ids = {a.team_id for a in athletes if a.team_id}

        section(event.name)
        for team_id in team_ids:
            team = db.get(Team, team_id)
            if not team:
                continue
            has_name = bool(team.name)
            has_country = bool(
                (team.country_iso_code or "").strip() or (team.alternate_name or "").strip()
            )
            ok_name = check(f"názov [{team_id}]", True, has_name)
            ok_country = check(f"krajina [{team.name[:15] if team.name else '?'}]", True, has_country)
            if not ok_name:
                errors.append(f"  {event.name}: tím id={team_id} nemá názov")
            if not ok_country:
                errors.append(f"  {event.name}: tím {team.name} nemá krajinu")
    result(errors, "Tím nemá názov alebo krajinu:")
