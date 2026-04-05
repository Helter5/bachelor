"""
Multi-Arena sync validation.

Arena A (test_one.sql): event + WCs + teams, NO athletes.
Arena B (test_two.sql): same event (different UUIDs) + WCs + teams + 4 athletes.

After syncing both sources the app must produce:
  - exactly 1 event (no duplicate)
  - 2 weight categories, 3 teams (no duplicates from two syncs)
  - 4 athletes (from Arena B; Arena A had none)
"""
from sqlmodel import select
from app.domain.entities.sport_event import SportEvent
from app.domain.entities.team import Team
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.discipline import Discipline
from app.domain.entities.athlete import Athlete
from app.domain.entities.person import Person
from tests.utils import check, section, result

EVENT_NAME = "Multi-Arena Test Cup"
EXPECTED_TEAMS = {"SLOVAKIA", "CZECHIA", "POLAND"}
EXPECTED_WCS = [(65, "fs", "seniors"), (74, "gr", "seniors")]
EXPECTED_ATHLETES = [
    ("Jan NOVAK", "SLOVAKIA"),
    ("Petr CERNY", "CZECHIA"),
    ("Michal KOWALSKI", "POLAND"),
    ("Tomas HORAK", "SLOVAKIA"),
]


def test_single_event_no_duplicate(db):
    """Two Arena sources with the same event must not create duplicates."""
    events = db.exec(select(SportEvent).where(SportEvent.name == EVENT_NAME)).all()
    section("Event deduplication")
    ok = check("počet eventov", 1, len(events))
    result(
        [] if ok else [f"  Nájdených {len(events)}x '{EVENT_NAME}'"],
        "Duplicitný event z dvoch Arén:"
    )


def test_weight_categories_no_duplicate(db, test_event):
    """WCs from both Arenas must be merged — not doubled."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == test_event.id)
    ).all()
    section("Weight categories")
    ok = check("počet WC", len(EXPECTED_WCS), len(wcs))
    result(
        [] if ok else [f"  Očakávané {len(EXPECTED_WCS)}, nájdených {len(wcs)}"],
        "Nesprávny počet weight categories:"
    )


def test_all_weight_categories_present(db, test_event):
    """65 kg FS seniors and 74 kg GR seniors must both be in DB."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == test_event.id)
    ).all()
    disciplines = {d.id: (d.sport_id, d.audience_id) for d in db.exec(select(Discipline)).all()}
    section("Weight category contents")
    errors = []
    for max_w, sport, audience in EXPECTED_WCS:
        found = any(
            wc.max_weight == max_w
            and disciplines.get(wc.discipline_id, (None, None)) == (sport, audience)
            for wc in wcs
        )
        ok = check(f"{max_w} kg {sport} {audience}", "yes", "yes" if found else "MISSING")
        if not ok:
            errors.append(f"  Chýba WC {max_w} kg {sport} {audience}")
    result(errors, "Chýbajúce weight categories:")


def test_teams_no_duplicate(db, test_event):
    """Teams synced from both Arenas must not create duplicates."""
    teams = db.exec(select(Team).where(Team.sport_event_id == test_event.id)).all()
    section("Team deduplication")
    errors = []
    counts: dict[str, int] = {}
    for t in teams:
        counts[t.name] = counts.get(t.name, 0) + 1
    for name, count in counts.items():
        ok = check(f"tím {name}", 1, count)
        if not ok:
            errors.append(f"  Duplikát '{name}': {count}x")
    result(errors, "Duplikátne tímy:")


def test_all_teams_present(db, test_event):
    """All three teams must be present."""
    teams = db.exec(select(Team).where(Team.sport_event_id == test_event.id)).all()
    names = {t.name for t in teams}
    section("Teams present")
    errors = []
    for name in EXPECTED_TEAMS:
        ok = check(f"tím {name}", "yes", "yes" if name in names else "MISSING")
        if not ok:
            errors.append(f"  Chýba tím '{name}'")
    result(errors, "Chýbajúce tímy:")


def test_athlete_count(db, test_event):
    """Exactly 4 athletes — from Arena B; re-syncing must not duplicate them."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == test_event.id)
    ).all()
    section("Athlete count")
    ok = check("počet atlétov", len(EXPECTED_ATHLETES), len(athletes))
    result(
        [] if ok else [f"  Očakávané {len(EXPECTED_ATHLETES)}, nájdených {len(athletes)}"],
        "Nesprávny počet atlétov:"
    )


def test_athletes_correct(db, test_event):
    """Each expected athlete must exist with the right team."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == test_event.id)
    ).all()
    persons = {p.id: p for p in db.exec(select(Person)).all()}
    teams = {
        t.id: t.name
        for t in db.exec(select(Team).where(Team.sport_event_id == test_event.id)).all()
    }
    actual = {
        (persons[a.person_id].full_name if a.person_id in persons else None,
         teams.get(a.team_id))
        for a in athletes
    }
    section("Athletes from Arena B")
    errors = []
    for name, team in EXPECTED_ATHLETES:
        ok = check(f"{name} / {team}", "yes", "yes" if (name, team) in actual else "MISSING")
        if not ok:
            errors.append(f"  Chýba atlét '{name}' / {team}")
    result(errors, "Chýbajúci atléti:")
