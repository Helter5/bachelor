"""
Sync validácia: tabuľka sport_events
Porovnáva podujatia v DB voči Arena API (/sport-event/).
"""
from sqlmodel import select
from app.domain.entities.sport_event import SportEvent
from tests.conftest import arena_fetch
from tests.utils import check, section, result


# ─────────────────────────────────────────────
# Pomocné funkcie
# ─────────────────────────────────────────────

async def _fetch_arena_events() -> list[dict]:
    """Stiahne všetky podujatia z Arena API."""
    data = await arena_fetch("sport-event/")
    return data.get("events", {}).get("items", [])


def _natural_key(name: str, start_date, country_iso_code: str) -> tuple:
    return (name or "", str(start_date or ""), country_iso_code or "")


def _db_events_by_natural_key(db) -> dict[tuple, SportEvent]:
    events = db.exec(select(SportEvent)).all()
    return {_natural_key(e.name, e.start_date, e.country_iso_code): e for e in events}


def _arena_natural_key(item: dict) -> tuple:
    return _natural_key(item.get("name"), item.get("startDate"), item.get("countryIsoCode"))


# ─────────────────────────────────────────────
# 1. Počet
# ─────────────────────────────────────────────

async def test_sport_events_count_matches_arena(db):
    """Počet podujatí v DB sa zhoduje s Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    ok = check("počet podujatí", len(arena), len(db_events))
    errors = []
    if not ok:
        errors.append(f"  Arena={len(arena)}, DB={len(db_events)}")
    result(errors, "Nesúlad počtu podujatí:")


# ─────────────────────────────────────────────
# 2. Chýbajúce / navyše
# ─────────────────────────────────────────────

async def test_no_missing_sport_events_in_db(db):
    """Každé podujatie z Arena API musí existovať v DB (podľa natural key)."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        key = _arena_natural_key(item)
        in_db = key in db_events
        ok = check(f"{item.get('name', '?')[:25]}", "áno", "áno" if in_db else "CHÝBA")
        if not ok:
            errors.append(f"  chýba: {item.get('name')} ({item.get('startDate')}, {item.get('countryIsoCode')})")
    result(errors, "Podujatia z Arény chýbajú v DB:")


async def test_no_extra_sport_events_in_db(db):
    """DB nesmie obsahovať podujatia ktoré v Arena API neexistujú."""
    arena = await _fetch_arena_events()
    arena_keys = {_arena_natural_key(item) for item in arena}
    db_events = _db_events_by_natural_key(db)
    extra = [e for key, e in db_events.items() if key not in arena_keys]
    section("Sport Events")
    check("navyše podujatia v DB", 0, len(extra))
    result(
        [f"  {e.name} ({e.start_date}, {e.country_iso_code})" for e in extra],
        "DB obsahuje podujatia ktoré nie sú v Aréne:"
    )


# ─────────────────────────────────────────────
# 3. Polia
# ─────────────────────────────────────────────

async def test_sport_event_name_correct(db):
    """`name` každého podujatia zodpovedá Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        ok = check(f"name [{item.get('name','?')[:20]}]", item.get("name"), db_ev.name)
        if not ok:
            errors.append(f"  Arena={item.get('name')!r}, DB={db_ev.name!r}")
    result(errors, "Nesprávne name:")


async def test_sport_event_start_date_correct(db):
    """`start_date` každého podujatia zodpovedá Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        arena_val = item.get("startDate")
        if arena_val is None:
            continue
        db_val = str(db_ev.start_date) if db_ev.start_date else None
        ok = check(f"start_date [{db_ev.name[:15]}]", arena_val, db_val)
        if not ok:
            errors.append(f"  {db_ev.name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne start_date:")


async def test_sport_event_end_date_correct(db):
    """`end_date` každého podujatia zodpovedá Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        arena_val = item.get("endDate")
        if arena_val is None:
            continue
        db_val = str(db_ev.end_date) if db_ev.end_date else None
        ok = check(f"end_date [{db_ev.name[:15]}]", arena_val, db_val)
        if not ok:
            errors.append(f"  {db_ev.name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne end_date:")


async def test_sport_event_country_iso_code_correct(db):
    """`country_iso_code` každého podujatia zodpovedá Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        arena_val = item.get("countryIsoCode") or ""
        db_val = db_ev.country_iso_code or ""
        ok = check(f"country [{db_ev.name[:15]}]", arena_val, db_val)
        if arena_val and not ok:
            errors.append(f"  {db_ev.name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne country_iso_code:")


async def test_sport_event_address_locality_correct(db):
    """`address_locality` každého podujatia zodpovedá Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        arena_val = item.get("addressLocality") or ""
        db_val = db_ev.address_locality or ""
        ok = check(f"locality [{db_ev.name[:15]}]", arena_val, db_val)
        if arena_val and not ok:
            errors.append(f"  {db_ev.name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne address_locality:")


async def test_sport_event_type_correct(db):
    """`tournament_type` a `event_type` každého podujatia zodpovedajú Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        for arena_key, db_attr in [("tournamentType", "tournament_type"), ("eventType", "event_type")]:
            arena_val = item.get(arena_key)
            if arena_val is None:
                continue
            db_val = getattr(db_ev, db_attr)
            ok = check(f"{db_attr} [{db_ev.name[:12]}]", arena_val, db_val)
            if not ok:
                errors.append(f"  {db_ev.name} / {db_attr}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne tournament_type / event_type:")


async def test_sport_event_flags_correct(db):
    """`is_individual_event`, `is_team_event` zodpovedajú Arena API."""
    arena = await _fetch_arena_events()
    db_events = _db_events_by_natural_key(db)
    section("Sport Events")
    errors = []
    for item in arena:
        db_ev = db_events.get(_arena_natural_key(item))
        if not db_ev:
            continue
        for arena_key, db_attr in [
            ("isIndividualEvent", "is_individual_event"),
            ("isTeamEvent", "is_team_event"),
        ]:
            arena_val = item.get(arena_key)
            if arena_val is None:
                continue
            db_val = getattr(db_ev, db_attr)
            ok = check(f"{db_attr} [{db_ev.name[:12]}]", arena_val, db_val)
            if not ok:
                errors.append(f"  {db_ev.name} / {db_attr}: Arena={arena_val}, DB={db_val}")
    result(errors, "Nesprávne event flags:")


# ─────────────────────────────────────────────
# 4. Integrita DB
# ─────────────────────────────────────────────

async def test_sport_events_have_name(db):
    """Každé podujatie musí mať vyplnený názov."""
    events = db.exec(select(SportEvent)).all()
    no_name = [e for e in events if not e.name]
    section("Integrita DB")
    check("podujatia bez názvu", 0, len(no_name))
    result(
        [f"  id={e.id}" for e in no_name],
        "Podujatia bez názvu:"
    )


async def test_sport_events_natural_key_unique(db):
    """Natural key (name, start_date, country_iso_code) musí byť unikátny."""
    events = db.exec(select(SportEvent)).all()
    keys = [_natural_key(e.name, e.start_date, e.country_iso_code) for e in events]
    duplicates = {k for k in keys if keys.count(k) > 1}
    section("Integrita DB")
    check("duplicitné natural keys", 0, len(duplicates))
    result(list(str(d) for d in duplicates), "Duplicitné natural keys:")
