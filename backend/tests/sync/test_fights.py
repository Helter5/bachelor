"""
Sync validácia: tabuľka fights
Porovnáva zápasy v DB voči Arena API
pre každé synchronizované podujatie (/fight/{event_uuid}).
Matching: natural key (fight_number + event) — fight_number je globálne unikátny v rámci eventu.
"""
import re
from sqlmodel import select
from app.domain.entities.fight import Fight
from app.domain.entities.athlete import Athlete
from app.domain.entities.person import Person
from app.domain.entities.team import Team
from app.domain.entities.weight_category import WeightCategory
from app.domain.entities.discipline import Discipline
from app.services.arena import fetch_all_arena_items
from tests.conftest import arena_fetch
from tests.utils import check, section, result



def _fight_natural_key(fight_number) -> str:
    return str(fight_number)


async def _fetch_arena_fights(event) -> dict[str, dict]:
    """Zápasy z Arena API deduplikované podľa fight_number."""
    if not event.arena_uuid:
        return {}
    data = await arena_fetch(f"fight/{event.arena_uuid}")
    fights = data.get("fights", [])
    result_map: dict[str, dict] = {}
    for f in fights:
        fight_number = f.get("fightNumber")
        if fight_number is None:
            continue
        result_map[_fight_natural_key(fight_number)] = f
    return result_map


def _db_fights_by_natural_key(db, event) -> dict[str, Fight]:
    """DB fights kľúčované podľa fight_number."""
    fights = db.exec(select(Fight).where(Fight.sport_event_id == event.id)).all()
    return {_fight_natural_key(f.fight_number): f for f in fights if f.fight_number is not None}


async def _build_athlete_uuid_map(db, event) -> dict[str, int]:
    """Arena athlete uuid → DB athlete.id via natural key matching (includes discipline)."""
    if not event.arena_uuid:
        return {}

    arena_athletes = await fetch_all_arena_items(f"athlete/{event.arena_uuid}", "athletes")
    teams_data = await arena_fetch(f"team/{event.arena_uuid}")
    arena_team_names = {
        t["id"]: t.get("name")
        for t in teams_data.get("sportEventTeams", {}).get("items", [])
        if t.get("id")
    }

    disciplines = {d.id: (d.sport_id, d.audience_id) for d in db.exec(select(Discipline)).all()}
    results = db.exec(
        select(Athlete, Person, Team, WeightCategory)
        .join(Person, Athlete.person_id == Person.id, isouter=True)
        .join(Team, Athlete.team_id == Team.id, isouter=True)
        .join(WeightCategory, Athlete.weight_category_id == WeightCategory.id, isouter=True)
        .where(Athlete.sport_event_id == event.id)
    ).all()
    db_lookup: dict[tuple, int] = {}
    for athlete, person, team, wc in results:
        sport_id, audience_id = disciplines.get(wc.discipline_id, (None, None)) if wc and wc.discipline_id else (None, None)
        key = (
            person.full_name if person else None,
            team.name if team else None,
            wc.max_weight if wc else None,
            sport_id,
            audience_id,
        )
        db_lookup[key] = athlete.id

    uuid_map: dict[str, int] = {}
    for a in arena_athletes:
        arena_uuid = a.get("id")
        if not arena_uuid:
            continue
        team_uuid = a.get("sportEventTeamId") or a.get("teamId")
        team_name = arena_team_names.get(team_uuid) if team_uuid else None
        wcs = a.get("weightCategories") or []
        wc_data = wcs[0] if wcs else {}
        key = (
            a.get("personFullName"),
            team_name,
            wc_data.get("maxWeight"),
            wc_data.get("sportId"),
            wc_data.get("audienceId"),
        )
        local_id = db_lookup.get(key)
        if local_id:
            uuid_map[arena_uuid] = local_id
    return uuid_map


def _build_wc_key_map(db, event) -> dict[tuple, int]:
    """(max_weight, sport_id, audience_id) → local wc_id from DB."""
    disciplines = {d.id: (d.sport_id, d.audience_id) for d in db.exec(select(Discipline)).all()}
    result_map: dict[tuple, int] = {}
    for wc in db.exec(select(WeightCategory).where(WeightCategory.sport_event_id == event.id)).all():
        if wc.discipline_id and wc.discipline_id in disciplines:
            sport_id, audience_id = disciplines[wc.discipline_id]
            result_map[(wc.max_weight, sport_id, audience_id)] = wc.id
    return result_map


def _parse_tp(result_text: str | None) -> tuple[int | None, int | None]:
    if not result_text:
        return None, None
    m = re.search(r'\((\d+)-(\d+)\)', result_text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None



async def test_fights_count_matches_arena(db, synced_events):
    """Počet zápasov v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        section(event.name)
        ok = check("počet zápasov", len(arena), len(db_fights))
        if not ok:
            errors.append(f"  {event.name}: Arena={len(arena)}, DB={len(db_fights)}")
    result(errors, "Nesúlad počtu zápasov:")



async def test_no_missing_fights_in_db(db, synced_events):
    """Každý zápas z Arena API musí existovať v DB (podľa fight_number)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            in_db = key in db_fights
            ok = check(f"fight#{f.get('fightNumber', '?')}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba fight#{f.get('fightNumber')}")
    result(errors, "Zápasy z Arény chýbajú v DB:")


async def test_no_extra_fights_in_db(db, synced_events):
    """DB nesmie obsahovať zápasy ktoré v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        extra = [f for key, f in db_fights.items() if key not in arena]
        section(event.name)
        check("navyše zápasy v DB", 0, len(extra))
        errors += [f"  {event.name}: navyše fight#{f.fight_number} (id={f.id})" for f in extra]
    result(errors, "DB obsahuje zápasy ktoré nie sú v Aréne:")



async def test_fight_fighters_correct(db, synced_events):
    """fighter_one_id a fighter_two_id zodpovedajú Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        uid_map = await _build_athlete_uuid_map(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f:
                continue
            expected_one = uid_map.get(f.get("fighter1AthleteId") or "")
            expected_two = uid_map.get(f.get("fighter2AthleteId") or "")
            ok1 = check(f"fighter1 [#{f.get('fightNumber')}]", expected_one, db_f.fighter_one_id)
            ok2 = check(f"fighter2 [#{f.get('fightNumber')}]", expected_two, db_f.fighter_two_id)
            if not ok1:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: fighter1 Arena={expected_one}, DB={db_f.fighter_one_id}")
            if not ok2:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: fighter2 Arena={expected_two}, DB={db_f.fighter_two_id}")
    result(errors, "Nesprávne fighter_one_id / fighter_two_id:")


async def test_fight_winner_correct(db, synced_events):
    """winner_id zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        uid_map = await _build_athlete_uuid_map(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f or not f.get("winnerFighter"):
                continue
            f1_db = uid_map.get(f.get("fighter1AthleteId") or "")
            f2_db = uid_map.get(f.get("fighter2AthleteId") or "")
            winner_fighter = f.get("winnerFighter")
            if winner_fighter == f.get("fighter1Id") or winner_fighter == f.get("fighter1"):
                expected_winner = f1_db
            elif winner_fighter == f.get("fighter2Id") or winner_fighter == f.get("fighter2"):
                expected_winner = f2_db
            else:
                expected_winner = None
            ok = check(f"winner [#{f.get('fightNumber')}]", expected_winner, db_f.winner_id)
            if not ok:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: Arena={expected_winner}, DB={db_f.winner_id}")
    result(errors, "Nesprávny winner_id:")


async def test_fight_weight_category_correct(db, synced_events):
    """weight_category_id zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        wc_map = _build_wc_key_map(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f:
                continue
            wc_key = (f.get("weightCategoryMaxWeight"), f.get("sportId"), f.get("audienceId"))
            expected = wc_map.get(wc_key)
            ok = check(f"weight_cat [#{f.get('fightNumber')}]", expected, db_f.weight_category_id)
            if not ok:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: Arena={expected}, DB={db_f.weight_category_id}")
    result(errors, "Nesprávne weight_category_id:")


async def test_fight_classification_points_correct(db, synced_events):
    """`cp_one` a `cp_two` zodpovedajú Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f:
                continue
            for arena_key, db_attr in [("fighter1RankingPoint", "cp_one"), ("fighter2RankingPoint", "cp_two")]:
                arena_val = f.get(arena_key)
                if arena_val is None:
                    continue
                db_val = getattr(db_f, db_attr)
                ok = check(f"{db_attr} [#{f.get('fightNumber')}]", arena_val, db_val)
                if not ok:
                    errors.append(f"  {event.name} / #{f.get('fightNumber')} / {db_attr}: Arena={arena_val}, DB={db_val}")
    result(errors, "Nesprávne cp_one / cp_two:")


async def test_fight_technical_points_correct(db, synced_events):
    """`tp_one` a `tp_two` parsované z result textu zodpovedajú DB."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f:
                continue
            arena_tp1, arena_tp2 = _parse_tp(f.get("result"))
            if arena_tp1 is None:
                continue
            ok1 = check(f"tp_one [#{f.get('fightNumber')}]", arena_tp1, db_f.tp_one)
            ok2 = check(f"tp_two [#{f.get('fightNumber')}]", arena_tp2, db_f.tp_two)
            if not ok1:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: tp_one Arena={arena_tp1}, DB={db_f.tp_one}")
            if not ok2:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: tp_two Arena={arena_tp2}, DB={db_f.tp_two}")
    result(errors, "Nesprávne tp_one / tp_two:")


async def test_fight_victory_type_correct(db, synced_events):
    """`victory_type` zodpovedá Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_fights(event)
        db_fights = _db_fights_by_natural_key(db, event)
        section(event.name)
        for key, f in arena.items():
            db_f = db_fights.get(key)
            if not db_f:
                continue
            arena_val = f.get("victoryType")
            if not arena_val:
                continue
            expected = arena_val[:10]
            ok = check(f"victory_type [#{f.get('fightNumber')}]", expected, db_f.victory_type)
            if not ok:
                errors.append(f"  {event.name} / #{f.get('fightNumber')}: Arena={expected!r}, DB={db_f.victory_type!r}")
    result(errors, "Nesprávny victory_type:")



async def test_no_fights_without_sport_event(db):
    """Každý zápas musí byť priradený k podujatiu."""
    orphans = db.exec(select(Fight).where(Fight.sport_event_id == None)).all()
    section("Integrita DB")
    check("zápasy bez sport_event_id", 0, len(orphans))
    result(
        [f"  fight#{f.fight_number} (id={f.id})" for f in orphans[:10]],
        "Zápasy bez sport_event_id:"
    )
