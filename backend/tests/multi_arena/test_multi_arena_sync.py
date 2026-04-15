"""
Multi-Arena sync validation (3 sources).

Test data layout after multi_arena_seed.py:

  Arena A (8080) — test_one.sql:
        "Multi-Arena Test Cup": 2 WCs, 3 teams (SVK/CZE/POL), 4 athletes

  Arena B (8081) — test_two.sql:
    "Multi-Arena Test Cup": 2 WCs, 3 teams (SVK/CZE/POL), 4 athletes
      Jan NOVAK/SVK, Petr CERNY/CZE, Michal KOWALSKI/POL, Tomas HORAK/SVK

  Arena C (8082) — test_three.sql:
    "Multi-Arena Test Cup": 2 WCs, 4 teams (SVK/CZE/POL + AUSTRIA),
      4 athletes — NOVAK+CERNY match B (dedup), WAGNER+BAUER are new
    "Arena C Exclusive Cup": 1 WC (86kg GR), 2 teams (HUNGARY/AUSTRIA), 2 athletes
      Zoltan KOVACS/HUNGARY, Hans FISCHER/AUSTRIA

Expected DB state after full seed:
  - Exactly 2 events (no duplicates of "Multi-Arena Test Cup")
  - Multi-Arena Test Cup: 2 WCs, 4 teams, 6 athletes
  - Arena C Exclusive Cup: 1 WC, 2 teams, 2 athletes

Routing tests verify that each Arena source exposes only its own events
(mirrors _resolve_event_uuid_for_source logic from sync.py).
"""
from sqlmodel import select

from app.domain.entities.sport_event import SportEvent
from app.domain.entities.team import Team
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.discipline import Discipline
from app.domain.entities.athlete import Athlete
from app.domain.entities.person import Person
from tests.utils import check, section, result
from tests.multi_arena.conftest import (
    MULTI_CUP_NAME,
    EXCLUSIVE_CUP_NAME,
    resolve_uuid,
)

# ── Expected data ──────────────────────────────────────────────────────────────

MULTI_CUP_EXPECTED_TEAMS = {"SLOVAKIA", "CZECHIA", "POLAND", "AUSTRIA"}
MULTI_CUP_EXPECTED_WCS = [(65, "fs", "seniors"), (74, "gr", "seniors")]
MULTI_CUP_EXPECTED_ATHLETES = [
    # From Arena B
    ("Jan NOVAK",      "SLOVAKIA"),
    ("Petr CERNY",     "CZECHIA"),
    ("Michal KOWALSKI","POLAND"),
    ("Tomas HORAK",    "SLOVAKIA"),
    # New from Arena C
    ("Karl WAGNER",    "AUSTRIA"),
    ("Franz BAUER",    "AUSTRIA"),
]

EXCLUSIVE_CUP_EXPECTED_TEAMS = {"HUNGARY", "AUSTRIA"}
EXCLUSIVE_CUP_EXPECTED_WCS = [(86, "gr", "seniors")]
EXCLUSIVE_CUP_EXPECTED_ATHLETES = [
    ("Zoltan KOVACS", "HUNGARY"),
    ("Hans FISCHER",  "AUSTRIA"),
]


# ── GROUP 1: Event deduplication ───────────────────────────────────────────────

def test_no_duplicate_multi_cup(db):
    """Three Arena sources with the same event must produce exactly 1 record."""
    events = db.exec(select(SportEvent).where(SportEvent.name == MULTI_CUP_NAME)).all()
    section("Event deduplication — Multi-Arena Test Cup")
    ok = check("počet eventov", 1, len(events))
    result(
        [] if ok else [f"  Nájdených {len(events)}x '{MULTI_CUP_NAME}'"],
        "Duplicitný event z troch Arén:"
    )


def test_exclusive_cup_exists(db):
    """Arena C Exclusive Cup must be created (it exists only in Arena C)."""
    events = db.exec(select(SportEvent).where(SportEvent.name == EXCLUSIVE_CUP_NAME)).all()
    section("Event existencia — Arena C Exclusive Cup")
    ok = check("počet eventov", 1, len(events))
    result(
        [] if ok else [f"  Nájdených {len(events)}x '{EXCLUSIVE_CUP_NAME}' (očakávané 1)"],
        "Exclusive Cup chýba alebo má duplikáty:"
    )


def test_total_test_event_count(db):
    """DB must contain exactly the 2 test events — no extras, no duplicates."""
    names = {MULTI_CUP_NAME, EXCLUSIVE_CUP_NAME}
    events = db.exec(
        select(SportEvent).where(SportEvent.name.in_(names))
    ).all()
    section("Celkový počet test eventov")
    ok = check("počet unikátnych eventov", 2, len(events))
    result(
        [] if ok else [f"  Nájdených {len(events)}, očakávané 2"],
        "Nesprávny počet eventov:"
    )


# ── GROUP 2: Multi-Arena Test Cup — weight categories ─────────────────────────

def test_multi_cup_wc_count(db, multi_cup):
    """WCs from all three Arenas must merge to exactly 2 (no duplicates)."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == multi_cup.id)
    ).all()
    section("Multi-Cup — weight categories deduplication")
    ok = check("počet WC", len(MULTI_CUP_EXPECTED_WCS), len(wcs))
    result(
        [] if ok else [f"  Očakávané {len(MULTI_CUP_EXPECTED_WCS)}, nájdených {len(wcs)}"],
        "Nesprávny počet weight categories:"
    )


def test_multi_cup_wcs_present(db, multi_cup):
    """65 kg FS seniors and 74 kg GR seniors must both be in DB."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == multi_cup.id)
    ).all()
    disciplines = {d.id: (d.sport_id, d.audience_id) for d in db.exec(select(Discipline)).all()}
    section("Multi-Cup — obsah weight categories")
    errors = []
    for max_w, sport, audience in MULTI_CUP_EXPECTED_WCS:
        found = any(
            wc.max_weight == max_w
            and disciplines.get(wc.discipline_id, (None, None)) == (sport, audience)
            for wc in wcs
        )
        ok = check(f"{max_w} kg {sport} {audience}", "yes", "yes" if found else "MISSING")
        if not ok:
            errors.append(f"  Chýba WC {max_w} kg {sport} {audience}")
    result(errors, "Chýbajúce weight categories:")


# ── GROUP 3: Multi-Arena Test Cup — teams ─────────────────────────────────────

def test_multi_cup_team_count(db, multi_cup):
    """4 unique teams: SVK/CZE/POL from A+B, AUSTRIA added by C."""
    teams = db.exec(select(Team).where(Team.sport_event_id == multi_cup.id)).all()
    section("Multi-Cup — počet tímov")
    ok = check("počet tímov", len(MULTI_CUP_EXPECTED_TEAMS), len(teams))
    result(
        [] if ok else [
            f"  Očakávané {len(MULTI_CUP_EXPECTED_TEAMS)}, nájdených {len(teams)}",
            f"  Tímy v DB: {sorted(t.name for t in teams)}",
        ],
        "Nesprávny počet tímov:"
    )


def test_multi_cup_teams_present(db, multi_cup):
    """All four expected teams must be present."""
    teams = db.exec(select(Team).where(Team.sport_event_id == multi_cup.id)).all()
    names = {t.name for t in teams}
    section("Multi-Cup — prítomnosť tímov")
    errors = []
    for name in MULTI_CUP_EXPECTED_TEAMS:
        ok = check(f"tím {name}", "yes", "yes" if name in names else "MISSING")
        if not ok:
            errors.append(f"  Chýba tím '{name}'")
    result(errors, "Chýbajúce tímy:")


def test_multi_cup_no_duplicate_teams(db, multi_cup):
    """No team must appear more than once."""
    teams = db.exec(select(Team).where(Team.sport_event_id == multi_cup.id)).all()
    section("Multi-Cup — duplikáty tímov")
    counts: dict[str, int] = {}
    for t in teams:
        counts[t.name] = counts.get(t.name, 0) + 1
    errors = []
    for name, count in counts.items():
        ok = check(f"tím {name}", 1, count)
        if not ok:
            errors.append(f"  Duplikát '{name}': {count}x")
    result(errors, "Duplikátne tímy:")


# ── GROUP 4: Multi-Arena Test Cup — athletes ──────────────────────────────────

def test_multi_cup_athlete_count(db, multi_cup):
    """6 athletes: 4 from Arena B + 2 new from Arena C (NOVAK+CERNY deduplicated)."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == multi_cup.id)
    ).all()
    section("Multi-Cup — počet atlétov")
    ok = check("počet atlétov", len(MULTI_CUP_EXPECTED_ATHLETES), len(athletes))
    result(
        [] if ok else [f"  Očakávané {len(MULTI_CUP_EXPECTED_ATHLETES)}, nájdených {len(athletes)}"],
        "Nesprávny počet atlétov:"
    )


def test_multi_cup_all_athletes_present(db, multi_cup):
    """Every expected athlete must exist with the correct team."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == multi_cup.id)
    ).all()
    persons = {p.id: p for p in db.exec(select(Person)).all()}
    teams = {
        t.id: t.name
        for t in db.exec(select(Team).where(Team.sport_event_id == multi_cup.id)).all()
    }
    actual = {
        (persons[a.person_id].full_name if a.person_id in persons else None,
         teams.get(a.team_id))
        for a in athletes
    }
    section("Multi-Cup — atléti (všetci)")
    errors = []
    for name, team in MULTI_CUP_EXPECTED_ATHLETES:
        ok = check(f"{name} / {team}", "yes", "yes" if (name, team) in actual else "MISSING")
        if not ok:
            errors.append(f"  Chýba '{name}' / {team}")
    result(errors, "Chýbajúci atléti:")


def test_multi_cup_no_duplicate_athletes(db, multi_cup):
    """Athletes shared between B and C (NOVAK, CERNY) must not be duplicated."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == multi_cup.id)
    ).all()
    persons = {p.id: p for p in db.exec(select(Person)).all()}
    section("Multi-Cup — duplikáty atlétov")
    name_counts: dict[str, int] = {}
    for a in athletes:
        full_name = persons[a.person_id].full_name if a.person_id in persons else "?"
        name_counts[full_name] = name_counts.get(full_name, 0) + 1
    errors = []
    for name, count in name_counts.items():
        ok = check(f"atlét {name}", 1, count)
        if not ok:
            errors.append(f"  Duplikát '{name}': {count}x")
    result(errors, "Duplikátni atléti:")


def test_multi_cup_arena_c_athletes_created(db, multi_cup):
    """Karl WAGNER and Franz BAUER (unique to Arena C) must be in DB."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == multi_cup.id)
    ).all()
    persons = {p.id: p for p in db.exec(select(Person)).all()}
    teams = {
        t.id: t.name
        for t in db.exec(select(Team).where(Team.sport_event_id == multi_cup.id)).all()
    }
    actual = {
        (persons[a.person_id].full_name if a.person_id in persons else None,
         teams.get(a.team_id))
        for a in athletes
    }
    section("Multi-Cup — noví atléti z Arény C")
    c_only = [("Karl WAGNER", "AUSTRIA"), ("Franz BAUER", "AUSTRIA")]
    errors = []
    for name, team in c_only:
        ok = check(f"{name} / {team}", "yes", "yes" if (name, team) in actual else "MISSING")
        if not ok:
            errors.append(f"  Chýba '{name}' / {team}")
    result(errors, "Chýbajúci atléti z Arény C:")


# ── GROUP 5: Arena C Exclusive Cup ────────────────────────────────────────────

def test_exclusive_cup_wc_count(db, exclusive_cup):
    """Exclusive Cup must have exactly 1 weight category."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == exclusive_cup.id)
    ).all()
    section("Exclusive Cup — weight categories")
    ok = check("počet WC", 1, len(wcs))
    result(
        [] if ok else [f"  Nájdených {len(wcs)}, očakávané 1"],
        "Nesprávny počet WC v Exclusive Cup:"
    )


def test_exclusive_cup_wc_content(db, exclusive_cup):
    """The WC must be 86 kg GR seniors."""
    wcs = db.exec(
        select(WeightCategory).where(WeightCategory.sport_event_id == exclusive_cup.id)
    ).all()
    disciplines = {d.id: (d.sport_id, d.audience_id) for d in db.exec(select(Discipline)).all()}
    section("Exclusive Cup — obsah WC")
    found = any(
        wc.max_weight == 86
        and disciplines.get(wc.discipline_id, (None, None)) == ("gr", "seniors")
        for wc in wcs
    )
    ok = check("86 kg gr seniors", "yes", "yes" if found else "MISSING")
    result(
        [] if ok else ["  Chýba WC 86 kg gr seniors"],
        "Nesprávna WC v Exclusive Cup:"
    )


def test_exclusive_cup_teams(db, exclusive_cup):
    """HUNGARY and AUSTRIA must both be present."""
    teams = db.exec(select(Team).where(Team.sport_event_id == exclusive_cup.id)).all()
    names = {t.name for t in teams}
    section("Exclusive Cup — tímy")
    errors = []
    for name in EXCLUSIVE_CUP_EXPECTED_TEAMS:
        ok = check(f"tím {name}", "yes", "yes" if name in names else "MISSING")
        if not ok:
            errors.append(f"  Chýba tím '{name}'")
    result(errors, "Chýbajúce tímy v Exclusive Cup:")


def test_exclusive_cup_athlete_count(db, exclusive_cup):
    """Exclusive Cup must have exactly 2 athletes."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == exclusive_cup.id)
    ).all()
    section("Exclusive Cup — počet atlétov")
    ok = check("počet atlétov", 2, len(athletes))
    result(
        [] if ok else [f"  Nájdených {len(athletes)}, očakávané 2"],
        "Nesprávny počet atlétov v Exclusive Cup:"
    )


def test_exclusive_cup_athletes(db, exclusive_cup):
    """Zoltan KOVACS/HUNGARY and Hans FISCHER/AUSTRIA must be present."""
    athletes = db.exec(
        select(Athlete).where(Athlete.sport_event_id == exclusive_cup.id)
    ).all()
    persons = {p.id: p for p in db.exec(select(Person)).all()}
    teams = {
        t.id: t.name
        for t in db.exec(select(Team).where(Team.sport_event_id == exclusive_cup.id)).all()
    }
    actual = {
        (persons[a.person_id].full_name if a.person_id in persons else None,
         teams.get(a.team_id))
        for a in athletes
    }
    section("Exclusive Cup — atléti")
    errors = []
    for name, team in EXCLUSIVE_CUP_EXPECTED_ATHLETES:
        ok = check(f"{name} / {team}", "yes", "yes" if (name, team) in actual else "MISSING")
        if not ok:
            errors.append(f"  Chýba '{name}' / {team}")
    result(errors, "Chýbajúci atléti v Exclusive Cup:")


# ── GROUP 6: Sync routing — which source has which event ──────────────────────

def test_multi_cup_in_source_a(source_a):
    """Multi-Arena Test Cup must be resolvable in Arena A (UUID starts aaaa...)."""
    section("Routing — Multi-Cup v Arene A")
    uuid = resolve_uuid(MULTI_CUP_NAME, source_a)
    ok = check("UUID nájdené", "yes", "yes" if uuid else "MISSING")
    result(
        [] if ok else ["  UUID nenájdené v Arene A"],
        "Multi-Cup nie je v Arene A:"
    )
    if uuid:
        ok2 = check("UUID prefix", True, uuid.startswith("aaaa"))
        result(
            [] if ok2 else [f"  Neočakávané UUID: {uuid}"],
            "Nesprávne UUID z Areny A:"
        )


def test_multi_cup_in_source_b(source_b):
    """Multi-Arena Test Cup must be resolvable in Arena B (UUID starts bbbb...)."""
    section("Routing — Multi-Cup v Arene B")
    uuid = resolve_uuid(MULTI_CUP_NAME, source_b)
    ok = check("UUID nájdené", "yes", "yes" if uuid else "MISSING")
    result(
        [] if ok else ["  UUID nenájdené v Arene B"],
        "Multi-Cup nie je v Arene B:"
    )
    if uuid:
        ok2 = check("UUID prefix", True, uuid.startswith("bbbb"))
        result(
            [] if ok2 else [f"  Neočakávané UUID: {uuid}"],
            "Nesprávne UUID z Areny B:"
        )


def test_multi_cup_in_source_c(source_c):
    """Multi-Arena Test Cup must be resolvable in Arena C (UUID starts cccc...)."""
    section("Routing — Multi-Cup v Arene C")
    uuid = resolve_uuid(MULTI_CUP_NAME, source_c)
    ok = check("UUID nájdené", "yes", "yes" if uuid else "MISSING")
    result(
        [] if ok else ["  UUID nenájdené v Arene C"],
        "Multi-Cup nie je v Arene C:"
    )
    if uuid:
        ok2 = check("UUID prefix", True, uuid.startswith("cccc"))
        result(
            [] if ok2 else [f"  Neočakávané UUID: {uuid}"],
            "Nesprávne UUID z Areny C:"
        )


def test_exclusive_cup_in_source_c(source_c):
    """Arena C Exclusive Cup must be found in Arena C."""
    section("Routing — Exclusive Cup v Arene C")
    uuid = resolve_uuid(EXCLUSIVE_CUP_NAME, source_c)
    ok = check("UUID nájdené", "yes", "yes" if uuid else "MISSING")
    result(
        [] if ok else ["  UUID nenájdené v Arene C"],
        "Exclusive Cup nie je v Arene C:"
    )


def test_exclusive_cup_not_in_source_a(source_a):
    """Arena C Exclusive Cup must NOT be found in Arena A (only exists in C)."""
    section("Routing — Exclusive Cup NIE je v Arene A")
    uuid = resolve_uuid(EXCLUSIVE_CUP_NAME, source_a)
    ok = check("UUID nie je prítomné", None, uuid)
    result(
        [] if ok else [f"  Nečakane nájdené UUID v Arene A: {uuid}"],
        "Exclusive Cup sa neočakávane nachádza v Arene A:"
    )


def test_exclusive_cup_not_in_source_b(source_b):
    """Arena C Exclusive Cup must NOT be found in Arena B (only exists in C)."""
    section("Routing — Exclusive Cup NIE je v Arene B")
    uuid = resolve_uuid(EXCLUSIVE_CUP_NAME, source_b)
    ok = check("UUID nie je prítomné", None, uuid)
    result(
        [] if ok else [f"  Nečakane nájdené UUID v Arene B: {uuid}"],
        "Exclusive Cup sa neočakávane nachádza v Arene B:"
    )
