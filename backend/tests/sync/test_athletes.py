"""
Sync validácia: tabuľka athletes
Porovnáva všetkých atlétov v DB voči Arena API
pre každé synchronizované podujatie (/athlete/{event_uuid}).
Matching: natural key (personFullName, team_name, wc_max_weight) — UUID sa nepoužíva.
"""
from sqlmodel import select
from app.domain.entities.athlete import Athlete
from app.domain.entities.team import Team
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.discipline import Discipline
from app.domain.entities.person import Person
from app.services.arena import fetch_all_arena_items
from tests.conftest import arena_fetch
from tests.utils import check, section, result


# ─────────────────────────────────────────────
# Pomocné funkcie
# ─────────────────────────────────────────────

def _athlete_natural_key(full_name: str | None, team_name: str | None, max_weight: int | None) -> str:
    return f"{full_name}|{team_name}|{max_weight}"


async def _fetch_arena_athletes(event) -> dict[str, dict]:
    """Stiahne atlétov pre daný event. Kľúč: natural key."""
    if not event.arena_uuid:
        return {}
    items = await fetch_all_arena_items(f"athlete/{event.arena_uuid}", "athletes")

    # Fetch teams for team name lookup
    teams_data = await arena_fetch(f"team/{event.arena_uuid}")
    arena_teams = {
        item["id"]: item.get("name")
        for item in teams_data.get("sportEventTeams", {}).get("items", [])
        if item.get("id")
    }

    result_map = {}
    for item in items:
        team_uuid = item.get("sportEventTeamId") or item.get("teamId")
        team_name = arena_teams.get(team_uuid) if team_uuid else None
        wcs = item.get("weightCategories") or []
        max_weight = wcs[0].get("maxWeight") if wcs else None
        key = _athlete_natural_key(item.get("personFullName"), team_name, max_weight)
        result_map[key] = item
    return result_map


def _db_athletes_by_natural_key(db, event) -> dict[str, Athlete]:
    athletes = db.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
    result_map = {}
    for a in athletes:
        person = db.get(Person, a.person_id) if a.person_id else None
        team = db.get(Team, a.team_id) if a.team_id else None
        wc = db.get(WeightCategory, a.weight_category_id) if a.weight_category_id else None
        key = _athlete_natural_key(
            person.full_name if person else None,
            team.name if team else None,
            wc.max_weight if wc else None,
        )
        result_map[key] = a
    return result_map


def _db_team_name_map(db, event) -> dict[int, str]:
    """DB team.id → team.name."""
    teams = db.exec(select(Team).where(Team.sport_event_id == event.id)).all()
    return {t.id: t.name for t in teams}


def _db_wc_max_weight_map(db, event) -> dict[int, int]:
    """DB weight_category.id → max_weight."""
    wcs = db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event.id)).all()
    return {wc.id: wc.max_weight for wc in wcs}


# ─────────────────────────────────────────────
# 1. Počet
# ─────────────────────────────────────────────

async def test_athletes_count_matches_arena(db, synced_events):
    """Počet atlétov v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena_count = 0 if not event.arena_uuid else len(
            await fetch_all_arena_items(f"athlete/{event.arena_uuid}", "athletes")
        )
        db_count = db.exec(
            select(Athlete).where(Athlete.sport_event_id == event.id)
        )
        db_count = len(list(db_count.all()))
        section(event.name)
        ok = check("počet atlétov", arena_count, db_count)
        if not ok:
            errors.append(f"  {event.name}: Arena={arena_count}, DB={db_count}")
    result(errors, "Nesúlad počtu atlétov:")


# ─────────────────────────────────────────────
# 2. Chýbajúce / navyše
# ─────────────────────────────────────────────

async def test_no_missing_athletes_in_db(db, synced_events):
    """Každý atlét z Arena API musí existovať v DB (podľa natural key)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            in_db = key in db_athletes
            ok = check(f"{f.get('personFullName', '?')[:20]}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba '{f.get('personFullName')}'")
    result(errors, "Atléti z Arény chýbajú v DB:")


async def test_no_extra_athletes_in_db(db, synced_events):
    """DB nesmie obsahovať atlétov ktorí v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_natural_key(db, event)
        extra = [a for key, a in db_athletes.items() if key not in arena]
        section(event.name)
        check("navyše atléti v DB", 0, len(extra))
        for a in extra:
            person = db.get(Person, a.person_id) if a.person_id else None
            name = person.full_name if person else f"id={a.id}"
            errors.append(f"  {event.name}: navyše '{name}'")
    result(errors, "DB obsahuje atlétov ktorí nie sú v Aréne:")


# ─────────────────────────────────────────────
# 3. Polia
# ─────────────────────────────────────────────

async def test_athlete_is_competing_correct(db, synced_events):
    """`is_competing` každého atléta zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            db_a = db_athletes.get(key)
            if not db_a:
                continue
            arena_val = f.get("isCompeting")
            if arena_val is None:
                continue
            ok = check(f"is_competing [{f.get('personFullName','?')[:15]}]", arena_val, db_a.is_competing)
            if not ok:
                errors.append(f"  {event.name} / {f.get('personFullName')}: Arena={arena_val}, DB={db_a.is_competing}")
    result(errors, "Nesprávne is_competing:")


async def test_athlete_person_name_correct(db, synced_events):
    """`person.full_name` zodpovedá Arena API `personFullName`."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            db_a = db_athletes.get(key)
            if not db_a or not db_a.person_id:
                continue
            person = db.get(Person, db_a.person_id)
            db_name = person.full_name if person else None
            arena_name = f.get("personFullName")
            ok = check(f"fullName [{(arena_name or '?')[:15]}]", arena_name, db_name)
            if not ok:
                errors.append(f"  {event.name}: Arena={arena_name!r}, DB={db_name!r}")
    result(errors, "Nesprávne meno atléta:")


# ─────────────────────────────────────────────
# 4. Integrita DB
# ─────────────────────────────────────────────

async def test_no_athletes_without_person(db):
    """Každý atlét musí mať priradenú osobu (person_id)."""
    orphans = db.exec(select(Athlete).where(Athlete.person_id == None)).all()
    section("Integrita DB")
    check("atléti bez person_id", 0, len(orphans))
    result(
        [f"  id={a.id}" for a in orphans[:10]],
        "Atléti bez person_id:"
    )


async def test_no_athletes_without_sport_event(db):
    """Každý atlét musí byť priradený k podujatiu."""
    orphans = db.exec(select(Athlete).where(Athlete.sport_event_id == None)).all()
    section("Integrita DB")
    check("atléti bez sport_event_id", 0, len(orphans))
    result(
        [f"  id={a.id}" for a in orphans[:10]],
        "Atléti bez sport_event_id:"
    )
