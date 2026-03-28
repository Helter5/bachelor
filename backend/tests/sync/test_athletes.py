"""
Sync validácia: tabuľka athletes
Porovnáva všetkých atlétov v DB voči Arena API
pre každé synchronizované podujatie (/athlete/{event_uuid}).
"""
from sqlmodel import select
from app.domain.entities.athlete import Athlete
from app.domain.entities.team import Team
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.person import Person
from tests.conftest import arena_fetch
from tests.utils import check, section, result


# ─────────────────────────────────────────────
# Pomocné funkcie
# ─────────────────────────────────────────────

async def _fetch_arena_athletes(event) -> dict[str, dict]:
    """Stiahne atlétov pre daný event z Arena API (/athlete/{uuid})."""
    data = await arena_fetch(f"athlete/{event.arena_uuid}")
    items = data.get("athletes", {}).get("items", [])
    return {item["id"]: item for item in items if item.get("id")}


def _db_athletes_by_uid(db, event) -> dict[str, Athlete]:
    athletes = db.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
    return {str(a.uid): a for a in athletes}


def _team_uid_map(db, event) -> dict[int, str]:
    """DB team.id → team.uid (string)."""
    teams = db.exec(select(Team).where(Team.sport_event_id == event.id)).all()
    return {t.id: str(t.uid) for t in teams}


def _wc_uid_map(db, event) -> dict[int, str]:
    """DB weight_category.id → weight_category.uid (string)."""
    wcs = db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event.id)).all()
    return {wc.id: str(wc.uid) for wc in wcs}


def _arena_team_uid(fighter: dict) -> str | None:
    return fighter.get("sportEventTeamId") or fighter.get("teamId")


def _arena_wc_uid(fighter: dict) -> str | None:
    wcs = fighter.get("weightCategories") or []
    return wcs[0].get("id") if wcs else None


# ─────────────────────────────────────────────
# 1. Počet
# ─────────────────────────────────────────────

async def test_athletes_count_matches_arena(db, synced_events):
    """Počet atlétov v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        section(event.name)
        ok = check("počet atlétov", len(arena), len(db_athletes))
        if not ok:
            errors.append(f"  {event.name}: Arena={len(arena)}, DB={len(db_athletes)}")
    result(errors, "Nesúlad počtu atlétov:")


# ─────────────────────────────────────────────
# 2. Chýbajúce / navyše
# ─────────────────────────────────────────────

async def test_no_missing_athletes_in_db(db, synced_events):
    """Každý atlét z Arena API musí existovať v DB (podľa UID)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            in_db = uid in db_athletes
            ok = check(f"{f.get('personFullName', uid)[:20]}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba {f.get('personFullName')} ({uid})")
    result(errors, "Atléti z Arény chýbajú v DB:")


async def test_no_extra_athletes_in_db(db, synced_events):
    """DB nesmie obsahovať atlétov ktorí v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        extra = [a for uid, a in db_athletes.items() if uid not in arena]
        section(event.name)
        check("navyše atléti v DB", 0, len(extra))
        errors += [f"  {event.name}: extra uid={a.uid}" for a in extra]
    result(errors, "DB obsahuje atlétov ktorí nie sú v Aréne:")


# ─────────────────────────────────────────────
# 3. Polia
# ─────────────────────────────────────────────

async def test_athlete_is_competing_correct(db, synced_events):
    """`is_competing` každého atléta zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_a = db_athletes.get(uid)
            if not db_a:
                continue
            arena_val = f.get("isCompeting")
            if arena_val is None:
                continue
            ok = check(f"is_competing [{f.get('personFullName','?')[:15]}]", arena_val, db_a.is_competing)
            if not ok:
                errors.append(f"  {event.name} / {f.get('personFullName')}: Arena={arena_val}, DB={db_a.is_competing}")
    result(errors, "Nesprávne is_competing:")


async def test_athlete_team_linked_correctly(db, synced_events):
    """Každý atlét je priradený k správnemu tímu (podľa Arena sportEventTeamId)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        team_uid_map = _team_uid_map(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_a = db_athletes.get(uid)
            if not db_a:
                continue
            arena_team_uid = _arena_team_uid(f)
            db_team_uid = team_uid_map.get(db_a.team_id) if db_a.team_id else None
            ok = check(f"team [{f.get('personFullName','?')[:15]}]", arena_team_uid, db_team_uid)
            if not ok:
                errors.append(
                    f"  {event.name} / {f.get('personFullName')}: "
                    f"Arena={arena_team_uid}, DB={db_team_uid}"
                )
    result(errors, "Nesprávne priradenie k tímu:")


async def test_athlete_weight_category_linked_correctly(db, synced_events):
    """Každý atlét je priradený k správnej váhovej kategórii."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        wc_uid_map = _wc_uid_map(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_a = db_athletes.get(uid)
            if not db_a:
                continue
            arena_wc_uid = _arena_wc_uid(f)
            if arena_wc_uid is None:
                continue
            db_wc_uid = wc_uid_map.get(db_a.weight_category_id) if db_a.weight_category_id else None
            ok = check(f"weight_cat [{f.get('personFullName','?')[:15]}]", arena_wc_uid, db_wc_uid)
            if not ok:
                errors.append(
                    f"  {event.name} / {f.get('personFullName')}: "
                    f"Arena={arena_wc_uid}, DB={db_wc_uid}"
                )
    result(errors, "Nesprávne priradenie k váhovej kategórii:")


async def test_athlete_person_name_correct(db, synced_events):
    """`person.full_name` zodpovedá Arena API `personFullName`."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_athletes(event)
        db_athletes = _db_athletes_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_a = db_athletes.get(uid)
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
        [f"  uid={a.uid}" for a in orphans[:10]],
        "Atléti bez person_id:"
    )


async def test_no_athletes_without_sport_event(db):
    """Každý atlét musí byť priradený k podujatiu."""
    orphans = db.exec(select(Athlete).where(Athlete.sport_event_id == None)).all()
    section("Integrita DB")
    check("atléti bez sport_event_id", 0, len(orphans))
    result(
        [f"  uid={a.uid}" for a in orphans[:10]],
        "Atléti bez sport_event_id:"
    )


async def test_athlete_uids_unique(db):
    """UID každého atléta musí byť unikátne v celej DB."""
    athletes = db.exec(select(Athlete)).all()
    uids = [str(a.uid) for a in athletes]
    duplicates = {uid for uid in uids if uids.count(uid) > 1}
    section("Integrita DB")
    check("duplicitné UID", 0, len(duplicates))
    result(list(duplicates), "Duplicitné UID atlétov:")
