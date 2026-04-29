"""
Sync validácia: tabuľka referees
Porovnáva rozhodcov v DB voči Arena API
pre každé synchronizované podujatie (/referee/{event_uuid}).
Matching: natural key (full_name, country_iso_code) v rámci eventu.
"""
from sqlmodel import select

from app.domain.entities.person import Person
from app.domain.entities.referee import Referee
from app.domain.entities.team import Team
from app.services.arena import fetch_all_arena_items
from app.utils.country_codes import normalize_country_iso_code
from tests.utils import check, section, result


def _referee_natural_key(full_name: str | None, country_iso_code: str | None) -> str:
    return f"{(full_name or '').strip()}|{(country_iso_code or '').strip()}"


def _split_full_name(full_name: str | None) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    if len(parts) == 1:
        return parts[0], ""
    return "", ""


def _normalize_style(val):
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        cleaned = val.strip()
        return [cleaned] if cleaned else []
    return [str(val).strip()] if str(val).strip() else []


async def _fetch_arena_referees(event) -> dict[str, dict]:
    """Stiahne rozhodcov pre daný event. Kľúč: (full_name, country_iso_code)."""
    if not event.arena_uuid:
        return {}

    items = await fetch_all_arena_items(f"referee/{event.arena_uuid}", "referees")

    result_map: dict[str, dict] = {}
    for item in items:
        full_name = item.get("fullName")
        origins = item.get("origins") or []
        country = normalize_country_iso_code(origins[0] if origins else None)
        key = _referee_natural_key(full_name, country)
        result_map[key] = item

    return result_map


def _db_referees_by_natural_key(db, event) -> dict[str, Referee]:
    referees = db.exec(select(Referee).where(Referee.sport_event_id == event.id)).all()

    result_map: dict[str, Referee] = {}
    for r in referees:
        person = db.get(Person, r.person_id) if r.person_id else None
        full_name = person.full_name if person else None
        country = person.country_iso_code if person else None
        key = _referee_natural_key(full_name, country)
        result_map[key] = r

    return result_map


def _db_team_maps(db, event) -> tuple[dict[str, int], dict[str, int]]:
    """Vracia mapy team.alternate_name a team.name -> team.id pre event."""
    teams = db.exec(select(Team).where(Team.sport_event_id == event.id)).all()
    by_alt_name = {t.alternate_name: t.id for t in teams if t.alternate_name}
    by_name = {t.name: t.id for t in teams if t.name}
    return by_alt_name, by_name



async def test_referees_count_matches_arena(db, synced_events):
    """Počet rozhodcov v DB sa zhoduje s Arena API pre každé podujatie."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        section(event.name)
        ok = check("počet rozhodcov", len(arena), len(db_referees))
        if not ok:
            errors.append(f"  {event.name}: Arena={len(arena)}, DB={len(db_referees)}")
    result(errors, "Nesúlad počtu rozhodcov:")



async def test_no_missing_referees_in_db(db, synced_events):
    """Každý rozhodca z Arena API musí existovať v DB (podľa natural key)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        section(event.name)
        for key, referee in arena.items():
            in_db = key in db_referees
            name = referee.get("fullName") or "?"
            ok = check(f"{name[:20]}", "áno", "áno" if in_db else "CHÝBA")
            if not ok:
                errors.append(f"  {event.name}: chýba '{name}'")
    result(errors, "Rozhodcovia z Arény chýbajú v DB:")


async def test_no_extra_referees_in_db(db, synced_events):
    """DB nesmie obsahovať rozhodcov ktorí v Arena API neexistujú."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        extra = [r for key, r in db_referees.items() if key not in arena]
        section(event.name)
        check("navyše rozhodcovia v DB", 0, len(extra))
        for r in extra:
            person = db.get(Person, r.person_id) if r.person_id else None
            name = person.full_name if person else f"id={r.id}"
            errors.append(f"  {event.name}: navyše '{name}'")
    result(errors, "DB obsahuje rozhodcov ktorí nie sú v Aréne:")



async def test_referee_core_fields_correct(db, synced_events):
    """Mapované polia rozhodcov zodpovedajú Arena API."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        section(event.name)
        for key, item in arena.items():
            db_r = db_referees.get(key)
            if not db_r:
                continue

            checks = [
                ("number", item.get("number"), db_r.number),
                ("referee_level", item.get("refereeLevel"), db_r.referee_level),
                ("referee_group", item.get("refereeGroup"), db_r.referee_group),
                ("delegate", item.get("delegate", False), db_r.delegate),
                ("matchairman", item.get("matchairman", False), db_r.matchairman),
                ("is_referee", item.get("referee", False), db_r.is_referee),
                ("mat_name", item.get("matName"), db_r.mat_name),
                ("deactivated", item.get("deactivated", False), db_r.deactivated),
            ]

            for field_name, arena_val, db_val in checks:
                ok = check(f"{field_name} [{(item.get('fullName') or '?')[:12]}]", arena_val, db_val)
                if not ok:
                    errors.append(
                        f"  {event.name} / {(item.get('fullName') or '?')}: "
                        f"{field_name} Arena={arena_val!r}, DB={db_val!r}"
                    )

            arena_style = _normalize_style(item.get("preferedStyle"))
            db_style = _normalize_style(db_r.preferred_style)
            ok_style = check(
                f"preferred_style [{(item.get('fullName') or '?')[:12]}]",
                arena_style,
                db_style,
            )
            if not ok_style:
                errors.append(
                    f"  {event.name} / {(item.get('fullName') or '?')}: "
                    f"preferred_style Arena={arena_style!r}, DB={db_style!r}"
                )

    result(errors, "Nesprávne polia rozhodcov:")


async def test_referee_person_mapping_correct(db, synced_events):
    """Rozhodca je napojený na správnu Person (first_name, last_name, country)."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        section(event.name)
        for key, item in arena.items():
            db_r = db_referees.get(key)
            if not db_r or not db_r.person_id:
                continue

            person = db.get(Person, db_r.person_id)
            if not person:
                errors.append(f"  {event.name}: referee id={db_r.id} má neexistujúci person_id={db_r.person_id}")
                continue

            expected_first, expected_last = _split_full_name(item.get("fullName"))
            origins = item.get("origins") or []
            expected_country = normalize_country_iso_code(origins[0] if origins else None) or ""
            db_country = person.country_iso_code or ""

            ok_first = check(f"first_name [{person.full_name[:12]}]", expected_first, person.first_name)
            ok_last = check(f"last_name [{person.full_name[:12]}]", expected_last, person.last_name)
            ok_country = check(f"country [{person.full_name[:12]}]", expected_country, db_country)

            if not ok_first:
                errors.append(
                    f"  {event.name} / {item.get('fullName')}: first_name Arena={expected_first!r}, DB={person.first_name!r}"
                )
            if not ok_last:
                errors.append(
                    f"  {event.name} / {item.get('fullName')}: last_name Arena={expected_last!r}, DB={person.last_name!r}"
                )
            if not ok_country:
                errors.append(
                    f"  {event.name} / {item.get('fullName')}: country Arena={expected_country!r}, DB={db_country!r}"
                )

    result(errors, "Nesprávne mapovanie rozhodca -> person:")


async def test_referee_team_resolution_correct(db, synced_events):
    """team_id sa resolvuje správne: najprv teamAlternateName, potom teamName."""
    errors = []
    for event in synced_events:
        arena = await _fetch_arena_referees(event)
        db_referees = _db_referees_by_natural_key(db, event)
        team_by_alt_name, team_by_name = _db_team_maps(db, event)
        section(event.name)

        for key, item in arena.items():
            db_r = db_referees.get(key)
            if not db_r:
                continue

            expected_team_id = None
            team_alt_name = item.get("teamAlternateName")
            team_name = item.get("teamName")

            if team_alt_name and team_alt_name in team_by_alt_name:
                expected_team_id = team_by_alt_name[team_alt_name]
            elif team_name and team_name in team_by_name:
                expected_team_id = team_by_name[team_name]

            ok = check(
                f"team_id [{(item.get('fullName') or '?')[:12]}]",
                expected_team_id,
                db_r.team_id,
            )
            if not ok:
                errors.append(
                    f"  {event.name} / {(item.get('fullName') or '?')}: "
                    f"team_id Arena={expected_team_id}, DB={db_r.team_id}"
                )

    result(errors, "Nesprávne mapovanie rozhodca -> team:")



async def test_no_referees_without_sport_event(db):
    """Každý rozhodca musí byť priradený k podujatiu."""
    orphans = db.exec(select(Referee).where(Referee.sport_event_id == None)).all()
    section("Integrita DB")
    check("rozhodcovia bez sport_event_id", 0, len(orphans))
    result([f"  id={r.id}" for r in orphans[:10]], "Rozhodcovia bez sport_event_id:")


async def test_referee_event_person_natural_key_unique(db):
    """Natural key (sport_event_id, person_id) musí byť unikátny."""
    referees = db.exec(select(Referee)).all()
    keys = [(r.sport_event_id, r.person_id) for r in referees if r.person_id is not None]
    duplicates = {k for k in keys if keys.count(k) > 1}
    section("Integrita DB")
    check("duplicitné event+person", 0, len(duplicates))
    result([f"  event={event_id}, person={person_id}" for event_id, person_id in duplicates], "Duplicitní rozhodcovia podľa event+person:")
