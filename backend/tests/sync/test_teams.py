"""
Sync validácia: tabuľka teams
Porovnáva všetky relevantné polia tímov v DB voči Arena API
pre každé synchronizované podujatie.
Matching: natural key (name) v rámci eventu — UUID sa nepoužíva.
"""
from sqlmodel import select
from app.domain.entities.team import Team
from tests.conftest import arena_fetch_all_items
from tests.utils import check, section, result


async def _fetch_arena_teams(event) -> dict[str, dict]:
    """Stiahne tímy pre daný event z Arena API. Kľúč: name."""
    if not event.arena_uuid:
        return {}
    items = await arena_fetch_all_items(
        f"team/{event.arena_uuid}",
        "sportEventTeams",
        "items",
    )
    return {item["name"]: item for item in items if item.get("name")}


def _db_teams_by_name(db, event) -> dict[str, Team]:
    teams = db.exec(select(Team).where(Team.sport_event_id == event.id)).all()
    return {t.name: t for t in teams}



async def test_teams_count_matches_arena(db, synced_events):
    """Počet tímov v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        ok = check("počet tímov", len(arena), len(db_teams))
        if not ok:
            errors.append(f"  {event.name}: Arena={len(arena)}, DB={len(db_teams)}")
    result(errors, "Nesúlad počtu tímov:")



async def test_no_missing_teams_in_db(db, synced_events):
    """Každý tím z Arena API musí existovať v DB (podľa name)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        for name, at in arena.items():
            in_db = name in db_teams
            ok = check(f"{name[:18]}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba '{name}'")
    result(errors, "Tímy z Arény chýbajú v DB:")


async def test_no_extra_teams_in_db(db, synced_events):
    """DB nesmie obsahovať tímy ktoré v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        event_extra = [t for name, t in db_teams.items() if name not in arena]
        section(event.name)
        check("navyše tímy v DB", 0, len(event_extra))
        errors += [f"  {event.name}: '{t.name}'" for t in event_extra]
    result(errors, "DB obsahuje tímy ktoré nie sú v Aréne:")



async def test_team_alternate_names_correct(db, synced_events):
    """`alternate_name` každého tímu zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        for name, at in arena.items():
            db_team = db_teams.get(name)
            if not db_team:
                continue
            arena_val = at.get("alternateName") or ""
            db_val = (db_team.alternate_name or "").strip()
            ok = check(f"alt [{name[:12]}]", arena_val, db_val)
            if not ok:
                errors.append(f"  {event.name} / {name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne alternate_name:")


async def test_team_country_iso_codes_correct(db, synced_events):
    """`country_iso_code` každého tímu zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        for name, at in arena.items():
            db_team = db_teams.get(name)
            if not db_team:
                continue
            arena_val = at.get("countryIsoCode") or ""
            db_val = (db_team.country_iso_code or "").strip()
            ok = check(f"country [{name[:12]}]", arena_val, db_val)
            if arena_val and not ok:
                errors.append(f"  {event.name} / {name}: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne country_iso_code:")


async def test_team_athlete_count_correct(db, synced_events):
    """`athlete_count` každého tímu zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        for name, at in arena.items():
            db_team = db_teams.get(name)
            if not db_team:
                continue
            arena_val = at.get("athleteCount")
            if arena_val is None:
                continue
            ok = check(f"athletes [{name[:12]}]", arena_val, db_team.athlete_count)
            if not ok:
                errors.append(f"  {event.name} / {name}: Arena={arena_val}, DB={db_team.athlete_count}")
    result(errors, "Nesprávne athlete_count:")


async def test_team_final_rank_correct(db, synced_events):
    """`final_rank` každého tímu zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_teams(event)
        db_teams = _db_teams_by_name(db, event)
        section(event.name)
        for name, at in arena.items():
            db_team = db_teams.get(name)
            if not db_team:
                continue
            arena_val = at.get("finalRank")
            if arena_val is None:
                continue
            ok = check(f"final_rank [{name[:12]}]", arena_val, db_team.final_rank)
            if not ok:
                errors.append(f"  {event.name} / {name}: Arena={arena_val}, DB={db_team.final_rank}")
    result(errors, "Nesprávne final_rank:")



async def test_no_teams_without_sport_event(db):
    """Každý tím musí byť priradený k podujatiu."""
    teams = db.exec(select(Team)).all()
    orphans = [t for t in teams if t.sport_event_id is None]
    section("Integrita DB")
    check("tímy bez event", 0, len(orphans))
    result(
        [f"  '{t.name}'" for t in orphans],
        "Tímy bez sport_event_id:"
    )
