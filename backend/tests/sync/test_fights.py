"""
Sync validácia: tabuľka fights
Porovnáva zápasy v DB voči Arena API
pre každé synchronizované podujatie (/fight/{event_uuid}).
"""
import re
from uuid import UUID
from sqlmodel import select
from app.domain.entities.fight import Fight
from app.domain.entities.athlete import Athlete
from app.domain.entities.weight_category import WeightCategory
from tests.conftest import arena_fetch
from tests.utils import check, section, result


# ─────────────────────────────────────────────
# Pomocné funkcie
# ─────────────────────────────────────────────

async def _fetch_arena_fights_raw(event) -> dict[str, dict]:
    """Všetky zápasy z Arena API bez deduplikácie (podľa UID)."""
    data = await arena_fetch(f"fight/{event.arena_uuid}")
    fights = data.get("fights", [])
    return {f["id"]: f for f in fights if f.get("id")}


async def _fetch_arena_fights(event) -> dict[str, dict]:
    """Zápasy z Arena API deduplikované podľa natural key
    (rovnakí fighters + váhová kategória) — Aréna môže obsahovať
    duplicitné záznamy pre ten istý zápas.
    """
    data = await arena_fetch(f"fight/{event.arena_uuid}")
    fights = data.get("fights", [])
    seen: dict[tuple, dict] = {}
    for f in fights:
        if not f.get("id"):
            continue
        key = (
            f.get("sportEventWeightCategoryId"),
            frozenset([f.get("fighter1AthleteId"), f.get("fighter2AthleteId")])
        )
        seen[key] = f  # last wins (mirrors DB MAX(id) behavior)
    return {f["id"]: f for f in seen.values()}


def _db_fights_by_uid(db, event) -> dict[str, Fight]:
    fights = db.exec(select(Fight).where(Fight.sport_event_id == event.id)).all()
    return {str(f.uid): f for f in fights}


def _athlete_uid_map(db, event) -> dict[str, int]:
    """Arena athlete uid (string) → DB athlete.id"""
    athletes = db.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
    return {str(a.uid): a.id for a in athletes}


def _wc_uid_map(db, event) -> dict[str, int]:
    """Arena weight_category uid (string) → DB weight_category.id"""
    wcs = db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event.id)).all()
    return {str(wc.uid): wc.id for wc in wcs}


def _parse_tp(result_text: str | None) -> tuple[int | None, int | None]:
    """Parsuje technické body z result textu napr. '2-0(4-2) by SP'."""
    if not result_text:
        return None, None
    m = re.search(r'\((\d+)-(\d+)\)', result_text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def _resolve_winner_athlete_id(f: dict, fighter_one_db_id: int | None, fighter_two_db_id: int | None) -> int | None:
    """Replikuje logiku fight_service._sync_fights_list pre určenie víťaza."""
    winner_fighter = f.get("winnerFighter")
    if not winner_fighter:
        return None
    if winner_fighter == f.get("fighter1Id") or winner_fighter == f.get("fighter1"):
        return fighter_one_db_id
    if winner_fighter == f.get("fighter2Id") or winner_fighter == f.get("fighter2"):
        return fighter_two_db_id
    return None


# ─────────────────────────────────────────────
# 1. Počet
# ─────────────────────────────────────────────

async def test_fights_count_matches_arena(db, synced_events):
    """Počet zápasov v DB je medzi dedup a raw počtom Arény.
    - dedup: unikátne zápasy (rovnakí fighteri = 1 zápas)
    - raw: všetky záznamy vrátane Arénnych duplicít
    Zápasy s nerozlíšenými fightermi (iná Arena inštancia) sa nedeuplikujú.
    """
    errors = []
    for event in synced_events:
        arena_dedup = await _fetch_arena_fights(event)
        arena_raw = await _fetch_arena_fights_raw(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        in_range = len(arena_dedup) <= len(db_fights) <= len(arena_raw)
        ok = check(f"počet [{len(arena_dedup)}..{len(arena_raw)}]", True, in_range)
        if not ok:
            errors.append(f"  {event.name}: DB={len(db_fights)}, očakávaný rozsah [{len(arena_dedup)}..{len(arena_raw)}]")
    result(errors, "Nesúlad počtu zápasov:")


# ─────────────────────────────────────────────
# 2. Chýbajúce / navyše
# ─────────────────────────────────────────────

async def test_no_missing_fights_in_db(db, synced_events):
    """Každý zápas z Arena API musí existovať v DB (podľa UID)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            in_db = uid in db_fights
            ok = check(f"{uid[:18]}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba fight {uid}")
    result(errors, "Zápasy z Arény chýbajú v DB:")


async def test_no_extra_fights_in_db(db, synced_events):
    """DB nesmie obsahovať zápasy ktoré v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights_raw(event)  # raw — každý UID z Arény
        db_fights = _db_fights_by_uid(db, event)
        extra = [f for uid, f in db_fights.items() if uid not in arena]
        section(event.name)
        check("navyše zápasy v DB", 0, len(extra))
        errors += [f"  {event.name}: extra uid={f.uid}" for f in extra]
    result(errors, "DB obsahuje zápasy ktoré nie sú v Aréne:")


# ─────────────────────────────────────────────
# 3. Polia
# ─────────────────────────────────────────────

async def test_fight_fighters_correct(db, synced_events):
    """fighter_one_id a fighter_two_id zodpovedajú Arena API (fighter1AthleteId / fighter2AthleteId)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        uid_map = _athlete_uid_map(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            expected_one = uid_map.get(f.get("fighter1AthleteId") or "")
            expected_two = uid_map.get(f.get("fighter2AthleteId") or "")
            ok1 = check(f"fighter1 [{uid[:12]}]", expected_one, db_f.fighter_one_id)
            ok2 = check(f"fighter2 [{uid[:12]}]", expected_two, db_f.fighter_two_id)
            if not ok1:
                errors.append(f"  {event.name} / {uid}: fighter1 Arena={expected_one}, DB={db_f.fighter_one_id}")
            if not ok2:
                errors.append(f"  {event.name} / {uid}: fighter2 Arena={expected_two}, DB={db_f.fighter_two_id}")
    result(errors, "Nesprávne fighter_one_id / fighter_two_id:")


async def test_fight_winner_correct(db, synced_events):
    """winner_id zodpovedá Arena API (winnerFighter logika)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        uid_map = _athlete_uid_map(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            if not f.get("winnerFighter"):
                continue
            f1_db = uid_map.get(f.get("fighter1AthleteId") or "")
            f2_db = uid_map.get(f.get("fighter2AthleteId") or "")
            expected_winner = _resolve_winner_athlete_id(f, f1_db, f2_db)
            ok = check(f"winner [{uid[:12]}]", expected_winner, db_f.winner_id)
            if not ok:
                errors.append(f"  {event.name} / {uid}: Arena={expected_winner}, DB={db_f.winner_id}")
    result(errors, "Nesprávny winner_id:")


async def test_fight_weight_category_correct(db, synced_events):
    """weight_category_id zodpovedá Arena API (sportEventWeightCategoryId)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        wc_map = _wc_uid_map(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            arena_wc_uid = f.get("sportEventWeightCategoryId")
            if not arena_wc_uid:
                continue
            expected = wc_map.get(arena_wc_uid)
            ok = check(f"weight_cat [{uid[:12]}]", expected, db_f.weight_category_id)
            if not ok:
                errors.append(f"  {event.name} / {uid}: Arena={expected}, DB={db_f.weight_category_id}")
    result(errors, "Nesprávne weight_category_id:")


async def test_fight_classification_points_correct(db, synced_events):
    """`cp_one` a `cp_two` (ranking points) zodpovedajú Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            for arena_key, db_attr in [("fighter1RankingPoint", "cp_one"), ("fighter2RankingPoint", "cp_two")]:
                arena_val = f.get(arena_key)
                if arena_val is None:
                    continue
                db_val = getattr(db_f, db_attr)
                ok = check(f"{db_attr} [{uid[:12]}]", arena_val, db_val)
                if not ok:
                    errors.append(f"  {event.name} / {uid} / {db_attr}: Arena={arena_val}, DB={db_val}")
    result(errors, "Nesprávne cp_one / cp_two:")


async def test_fight_technical_points_correct(db, synced_events):
    """`tp_one` a `tp_two` parsované z result textu zodpovedajú DB."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            arena_tp1, arena_tp2 = _parse_tp(f.get("result"))
            if arena_tp1 is None:
                continue
            ok1 = check(f"tp_one [{uid[:12]}]", arena_tp1, db_f.tp_one)
            ok2 = check(f"tp_two [{uid[:12]}]", arena_tp2, db_f.tp_two)
            if not ok1:
                errors.append(f"  {event.name} / {uid}: tp_one Arena={arena_tp1}, DB={db_f.tp_one}")
            if not ok2:
                errors.append(f"  {event.name} / {uid}: tp_two Arena={arena_tp2}, DB={db_f.tp_two}")
    result(errors, "Nesprávne tp_one / tp_two:")


async def test_fight_victory_type_correct(db, synced_events):
    """`victory_type` zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            arena_val = f.get("victoryType")
            if not arena_val:
                continue
            expected = arena_val[:10]  # service truncates to 10 chars
            ok = check(f"victory_type [{uid[:12]}]", expected, db_f.victory_type)
            if not ok:
                errors.append(f"  {event.name} / {uid}: Arena={expected!r}, DB={db_f.victory_type!r}")
    result(errors, "Nesprávny victory_type:")


async def test_fight_duration_correct(db, synced_events):
    """`duration` (endTime) zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_uid(db, event)
        section(event.name)
        for uid, f in arena.items():
            db_f = db_fights.get(uid)
            if not db_f:
                continue
            arena_val = f.get("endTime")
            if arena_val is None:
                continue
            ok = check(f"duration [{uid[:12]}]", arena_val, db_f.duration)
            if not ok:
                errors.append(f"  {event.name} / {uid}: Arena={arena_val}, DB={db_f.duration}")
    result(errors, "Nesprávna duration:")


# ─────────────────────────────────────────────
# 4. Integrita DB
# ─────────────────────────────────────────────

async def test_no_fights_without_sport_event(db):
    """Každý zápas musí byť priradený k podujatiu."""
    orphans = db.exec(select(Fight).where(Fight.sport_event_id == None)).all()
    section("Integrita DB")
    check("zápasy bez sport_event_id", 0, len(orphans))
    result(
        [f"  uid={f.uid}" for f in orphans[:10]],
        "Zápasy bez sport_event_id:"
    )


async def test_fight_uids_unique(db):
    """UID každého zápasu musí byť unikátne v celej DB."""
    fights = db.exec(select(Fight)).all()
    uids = [str(f.uid) for f in fights]
    duplicates = {uid for uid in uids if uids.count(uid) > 1}
    section("Integrita DB")
    check("duplicitné UID", 0, len(duplicates))
    result(list(duplicates), "Duplicitné UID zápasov:")
