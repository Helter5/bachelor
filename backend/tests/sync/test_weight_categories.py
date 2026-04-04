"""
Sync validácia: tabuľka weight_categories
Porovnáva váhové kategórie v DB voči Arena API
pre každé synchronizované podujatie.
Matching: natural key (max_weight, sport_id) v rámci eventu — UUID sa nepoužíva.
"""
from sqlmodel import select
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.discipline import Discipline
from tests.conftest import arena_fetch
from tests.utils import check, section, result


def _natural_key(max_weight, sport_id) -> str:
    return f"{max_weight}_{sport_id}"


async def _fetch_arena_wcs(event) -> dict[str, dict]:
    """Stiahne váhové kategórie pre daný event. Kľúč: (max_weight, sport_id)."""
    if not event.arena_uuid:
        return {}
    data = await arena_fetch(f"weight-category/{event.arena_uuid}")
    items = data.get("weightCategories", [])
    return {
        _natural_key(item.get("maxWeight"), item.get("sportId")): item
        for item in items
        if item.get("maxWeight") is not None
    }


def _db_wcs_by_natural_key(db, event) -> dict[str, WeightCategory]:
    wcs = db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event.id)).all()
    result_map = {}
    for wc in wcs:
        discipline = db.get(Discipline, wc.discipline_id) if wc.discipline_id else None
        sport_id = discipline.sport_id if discipline else None
        key = _natural_key(wc.max_weight, sport_id)
        result_map[key] = wc
    return result_map


# ─────────────────────────────────────────────
# 1. Počet
# ─────────────────────────────────────────────

async def test_weight_categories_count_matches_arena(db, synced_events):
    """Počet váhových kategórií v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        ok = check("počet kategórií", len(arena), len(db_wcs))
        if not ok:
            errors.append(f"  {event.name}: Arena={len(arena)}, DB={len(db_wcs)}")
    result(errors, "Nesúlad počtu váhových kategórií:")


# ─────────────────────────────────────────────
# 2. Chýbajúce / navyše
# ─────────────────────────────────────────────

async def test_no_missing_weight_categories_in_db(db, synced_events):
    """Každá váhová kategória z Arena API musí existovať v DB (podľa natural key)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            in_db = key in db_wcs
            label = f"{wc.get('maxWeight', '?')} kg / {wc.get('sportId', '?')}"
            ok = check(label, "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba {label}")
    result(errors, "Váhové kategórie z Arény chýbajú v DB:")


async def test_no_extra_weight_categories_in_db(db, synced_events):
    """DB nesmie obsahovať váhové kategórie ktoré v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        extra = [wc for key, wc in db_wcs.items() if key not in arena]
        section(event.name)
        check("navyše kategórie v DB", 0, len(extra))
        errors += [f"  {event.name}: {wc.max_weight} kg" for wc in extra]
    result(errors, "DB obsahuje váhové kategórie ktoré nie sú v Aréne:")


# ─────────────────────────────────────────────
# 3. Polia
# ─────────────────────────────────────────────

async def test_weight_category_count_fighters_correct(db, synced_events):
    """`count_fighters` každej kategórie zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc:
                continue
            arena_val = wc.get("countFighters")
            if arena_val is None:
                continue
            ok = check(f"count_fighters [{wc.get('maxWeight', '?')} kg]", arena_val, db_wc.count_fighters)
            if not ok:
                errors.append(f"  {event.name} / {wc.get('maxWeight')} kg: Arena={arena_val}, DB={db_wc.count_fighters}")
    result(errors, "Nesprávne count_fighters:")


async def test_weight_category_is_started_correct(db, synced_events):
    """`is_started` každej kategórie zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc:
                continue
            arena_val = wc.get("isStarted")
            if arena_val is None:
                continue
            ok = check(f"is_started [{wc.get('maxWeight', '?')} kg]", arena_val, db_wc.is_started)
            if not ok:
                errors.append(f"  {event.name} / {wc.get('maxWeight')} kg: Arena={arena_val}, DB={db_wc.is_started}")
    result(errors, "Nesprávne is_started:")


async def test_weight_category_is_completed_correct(db, synced_events):
    """`is_completed` každej kategórie zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc:
                continue
            arena_val = wc.get("isCompleted")
            if arena_val is None:
                continue
            ok = check(f"is_completed [{wc.get('maxWeight', '?')} kg]", arena_val, db_wc.is_completed)
            if not ok:
                errors.append(f"  {event.name} / {wc.get('maxWeight')} kg: Arena={arena_val}, DB={db_wc.is_completed}")
    result(errors, "Nesprávne is_completed:")


async def test_weight_category_discipline_linked_correctly(db, synced_events):
    """Každá kategória je priradená k správnej disciplíne (podľa Arena sportId)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc:
                continue
            arena_sport_id = wc.get("sportId")
            if arena_sport_id is None:
                continue
            db_discipline = db.get(Discipline, db_wc.discipline_id) if db_wc.discipline_id else None
            db_sport_id = db_discipline.sport_id if db_discipline else None
            ok = check(f"sportId [{wc.get('maxWeight', '?')} kg]", arena_sport_id, db_sport_id)
            if not ok:
                errors.append(
                    f"  {event.name} / {wc.get('maxWeight')} kg: "
                    f"Arena sportId={arena_sport_id}, DB sportId={db_sport_id}"
                )
    result(errors, "Nesprávna disciplína:")


async def test_weight_category_discipline_sport_name_correct(db, synced_events):
    """`discipline.sport_name` každej kategórie zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc or not db_wc.discipline_id:
                continue
            arena_val = wc.get("sportName")
            if arena_val is None:
                continue
            discipline = db.get(Discipline, db_wc.discipline_id)
            db_val = discipline.sport_name if discipline else None
            ok = check(f"sport_name [{wc.get('maxWeight', '?')} kg]", arena_val, db_val)
            if not ok:
                errors.append(f"  {event.name} / {wc.get('maxWeight')} kg: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne sport_name (disciplína):")


async def test_weight_category_discipline_audience_name_correct(db, synced_events):
    """`discipline.audience_name` každej kategórie zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_wcs(event)
        db_wcs = _db_wcs_by_natural_key(db, event)
        section(event.name)
        for key, wc in arena.items():
            db_wc = db_wcs.get(key)
            if not db_wc or not db_wc.discipline_id:
                continue
            arena_val = wc.get("audienceName")
            if arena_val is None:
                continue
            discipline = db.get(Discipline, db_wc.discipline_id)
            db_val = discipline.audience_name if discipline else None
            ok = check(f"audience_name [{wc.get('maxWeight', '?')} kg]", arena_val, db_val)
            if not ok:
                errors.append(f"  {event.name} / {wc.get('maxWeight')} kg: Arena={arena_val!r}, DB={db_val!r}")
    result(errors, "Nesprávne audience_name (disciplína):")


# ─────────────────────────────────────────────
# 4. Integrita DB
# ─────────────────────────────────────────────

async def test_no_weight_categories_without_sport_event(db):
    """Každá váhová kategória musí byť priradená k podujatiu."""
    orphans = db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == None)).all()
    section("Integrita DB")
    check("kategórie bez sport_event_id", 0, len(orphans))
    result(
        [f"  {wc.max_weight} kg (id={wc.id})" for wc in orphans[:10]],
        "Váhové kategórie bez sport_event_id:"
    )
