"""Protected Admin API - local agent sync upload."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlmodel import Session, select

from ....config import get_settings
from ....core.dependencies import require_admin, validate_csrf_and_origin
from ....core.security import ALGORITHM, get_client_ip
from ....database import get_session
from ....domain import SportEventBase
from ....domain.entities.athlete import Athlete
from ....domain.entities.person import Person
from ....domain.entities.sync_log import SyncLog
from ....domain.entities.team import Team
from ....domain.entities.user import User
from ....domain.entities.weight_category import WeightCategory
from ....domain.entities.discipline import Discipline
from ....services.admin_sync_service import AdminSyncService
from ....services.athlete_service import AthleteService
from ....services.fight_service import FightService
from ....services.referee_service import RefereeService
from ....services.sport_event_service import SportEventService
from ....services.team_service import TeamService
from ....services.weight_category_service import WeightCategoryService

router = APIRouter(prefix="/admin/local-sync")
settings = get_settings()
SERVER_PROGRESS_START = 50
SERVER_PROGRESS_END = 99


def _create_local_sync_token(user_id: int, sync_log_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = {
        "sub": str(user_id),
        "sync_log_id": sync_log_id,
        "typ": "local_sync_upload",
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def _decode_local_sync_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local sync token") from exc

    if payload.get("typ") != "local_sync_upload":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local sync token type")
    return payload


def _bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing upload token")
    return authorization.split(" ", 1)[1].strip()


def _event_payload_to_base(event_data: dict[str, Any]) -> SportEventBase:
    data = dict(event_data)
    data.pop("id", None)
    field_map = {
        "startDate": "start_date",
        "endDate": "end_date",
        "addressLocality": "address_locality",
        "isIndividualEvent": "is_individual_event",
        "isTeamEvent": "is_team_event",
        "isBeachWrestlingTournament": "is_beach_wrestling",
        "tournamentType": "tournament_type",
        "eventType": "event_type",
        "isSyncEnabled": "is_sync_enabled",
        "countryIsoCode": "country_iso_code",
    }
    for arena_key, db_key in field_map.items():
        if arena_key in data:
            data[db_key] = data.pop(arena_key)
    return SportEventBase(**data)


def _team_uuid_map(session: Session, event_db_id: int, teams_payload: list[dict[str, Any]]) -> dict[str, int]:
    db_teams = session.exec(select(Team).where(Team.sport_event_id == event_db_id)).all()
    by_name = {team.name: team.id for team in db_teams}
    by_alt_name = {team.alternate_name: team.id for team in db_teams if team.alternate_name}

    result: dict[str, int] = {}
    for team in teams_payload:
        arena_uuid = team.get("id")
        name = team.get("name")
        if not arena_uuid or not name:
            continue
        if name in by_name:
            result[arena_uuid] = by_name[name]
        elif name in by_alt_name:
            result[arena_uuid] = by_alt_name[name]
    return result


def _athlete_uuid_map(
    session: Session,
    event_db_id: int,
    athletes_payload: list[dict[str, Any]],
    teams_payload: list[dict[str, Any]],
) -> dict[str, int]:
    arena_team_names = {team["id"]: team.get("name") for team in teams_payload if team.get("id")}
    disciplines = {
        discipline.id: (discipline.sport_id, discipline.audience_id)
        for discipline in session.exec(select(Discipline)).all()
    }
    rows = session.exec(
        select(Athlete, Person, Team, WeightCategory)
        .join(Person, Athlete.person_id == Person.id, isouter=True)
        .join(Team, Athlete.team_id == Team.id, isouter=True)
        .join(WeightCategory, Athlete.weight_category_id == WeightCategory.id, isouter=True)
        .where(Athlete.sport_event_id == event_db_id)
    ).all()

    db_lookup: dict[tuple[Any, ...], int] = {}
    for athlete, person, team, wc in rows:
        sport_id, audience_id = (
            disciplines.get(wc.discipline_id, (None, None))
            if wc and wc.discipline_id
            else (None, None)
        )
        db_lookup[(person.full_name if person else None, team.name if team else None, wc.max_weight if wc else None, sport_id, audience_id)] = athlete.id

    result: dict[str, int] = {}
    for athlete in athletes_payload:
        arena_uuid = athlete.get("id")
        if not arena_uuid:
            continue
        team_uuid = athlete.get("sportEventTeamId") or athlete.get("teamId")
        wcs = athlete.get("weightCategories") or []
        wc_data = wcs[0] if wcs else {}
        key = (
            athlete.get("personFullName"),
            arena_team_names.get(team_uuid) if team_uuid else None,
            wc_data.get("maxWeight"),
            wc_data.get("sportId"),
            wc_data.get("audienceId"),
        )
        local_id = db_lookup.get(key)
        if local_id:
            result[arena_uuid] = local_id
    return result


def _update_progress(
    sync_admin: AdminSyncService,
    sync_log: SyncLog,
    current_step: str,
    progress: int,
    current_event: Optional[str] = None,
) -> None:
    previous_progress = int((sync_log.details or {}).get("progress_percent") or 0)
    sync_log.details = {
        **(sync_log.details or {}),
        "current_step": current_step,
        "progress_percent": max(previous_progress, progress),
    }
    if current_event:
        sync_log.details["current_event"] = current_event
    sync_admin.session.add(sync_log)
    sync_admin.session.commit()


def _stage_progress(event_index: int, event_total: int, stage_index: int, stage_total: int) -> int:
    if event_total <= 0 or stage_total <= 0:
        return SERVER_PROGRESS_START
    completed_units = (event_index * stage_total) + stage_index
    total_units = event_total * stage_total
    span = SERVER_PROGRESS_END - SERVER_PROGRESS_START
    return min(SERVER_PROGRESS_END, SERVER_PROGRESS_START + int((completed_units / total_units) * span))


@router.post("/start", response_model=dict)
async def start_local_sync(
    request: Request,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Create a local-agent sync run and return a short-lived upload token."""
    sync_admin = AdminSyncService(session)
    sync_admin.ensure_sync_run_access(None, allow_start_new=True)
    source = sync_admin.get_active_arena_source(user.id)
    if not all([source.client_id, source.client_secret, source.api_key]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktívny Arena zdroj nemá vyplnený Client ID, Client Secret alebo API kľúč.",
        )

    sync_log = sync_admin.create_sync_log(
        user=user,
        ip_address=get_client_ip(request),
        current_step="agent",
    )
    sync_log.details = {
        **(sync_log.details or {}),
        "mode": "local_agent",
        "source_id": source.id,
        "source_name": source.name,
        "host": f"{source.host}:{source.port}",
    }
    session.add(sync_log)
    session.commit()

    return {
        "sync_log_id": sync_log.id,
        "upload_token": _create_local_sync_token(user.id, sync_log.id),
        "arena_source": {
            "host": source.host,
            "port": source.port,
            "client_id": source.client_id,
            "client_secret": source.client_secret,
            "api_key": source.api_key,
        },
    }


@router.post("/run", response_model=dict)
async def run_local_sync_upload(
    payload: dict[str, Any],
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Receive a full Arena data bundle from the local agent and sync it into the DB."""
    token_payload = _decode_local_sync_token(_bearer_token(authorization))
    user_id = int(token_payload["sub"])
    sync_log_id = int(token_payload["sync_log_id"])

    sync_admin = AdminSyncService(session)
    sync_admin.ensure_sync_run_access(sync_log_id, allow_start_new=False)
    sync_log = session.get(SyncLog, sync_log_id)
    if not sync_log or sync_log.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local sync run not found")

    start_time = AdminSyncService.as_utc_datetime(sync_log.started_at)

    try:
        events = payload.get("events") or []
        event_payloads = payload.get("event_payloads") or {}
        if not isinstance(events, list) or not isinstance(event_payloads, dict):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid local sync payload")

        sport_event_service = SportEventService(session)
        team_service = TeamService(session)
        wc_service = WeightCategoryService(session)
        athlete_service = AthleteService(session)
        referee_service = RefereeService(session)
        fight_service = FightService(session)

        totals = {
            "events_created": 0,
            "events_updated": 0,
            "teams_created": 0,
            "teams_updated": 0,
            "weight_categories_created": 0,
            "weight_categories_updated": 0,
            "athletes_created": 0,
            "athletes_updated": 0,
            "referees_created": 0,
            "referees_updated": 0,
            "fights_created": 0,
            "fights_updated": 0,
        }

        event_id_by_arena_uuid: dict[str, int] = {}
        _update_progress(sync_admin, sync_log, "events", SERVER_PROGRESS_START)
        for event_data in events:
            arena_uuid = event_data.get("id")
            result = await sport_event_service.sync_event(_event_payload_to_base(event_data))
            if arena_uuid:
                event_id_by_arena_uuid[str(arena_uuid)] = int(result["id"])
            if result.get("matched_by") == "new":
                totals["events_created"] += 1
            elif result.get("matched_by") == "updated":
                totals["events_updated"] += 1

        event_items = list(event_id_by_arena_uuid.items())
        stage_order = ["teams", "categories", "athletes", "referees", "fights"]

        for event_idx, (arena_uuid, event_db_id) in enumerate(event_items):
            bundle = event_payloads.get(arena_uuid) or {}
            teams = bundle.get("teams") or []
            categories = bundle.get("categories") or []
            athletes = bundle.get("athletes") or []
            referees = bundle.get("referees") or []
            fights = bundle.get("fights") or []
            event_name = next((item.get("name") for item in events if str(item.get("id")) == arena_uuid), None)

            _update_progress(
                sync_admin,
                sync_log,
                "teams",
                _stage_progress(event_idx, len(event_items), 0, len(stage_order)),
                event_name,
            )
            team_result = team_service._sync_teams_list(teams, event_db_id)
            totals["teams_created"] += team_result["created"]
            totals["teams_updated"] += team_result["updated"]
            session.commit()

            _update_progress(
                sync_admin,
                sync_log,
                "categories",
                _stage_progress(event_idx, len(event_items), 1, len(stage_order)),
                event_name,
            )
            wc_result = wc_service._sync_weight_categories_list(categories, event_db_id)
            totals["weight_categories_created"] += wc_result["created"]
            totals["weight_categories_updated"] += wc_result["updated"]
            session.commit()

            _update_progress(
                sync_admin,
                sync_log,
                "athletes",
                _stage_progress(event_idx, len(event_items), 2, len(stage_order)),
                event_name,
            )
            athlete_result = athlete_service._sync_athletes_list(
                athletes,
                event_db_id,
                _team_uuid_map(session, event_db_id, teams),
                athlete_service._build_wc_key_map(event_db_id),
            )
            totals["athletes_created"] += athlete_result["created"]
            totals["athletes_updated"] += athlete_result["updated"]
            session.commit()

            _update_progress(
                sync_admin,
                sync_log,
                "referees",
                _stage_progress(event_idx, len(event_items), 3, len(stage_order)),
                event_name,
            )
            team_by_alt_name, team_by_name = referee_service._build_team_maps(event_db_id)
            referee_result = referee_service._sync_referees_list(referees, event_db_id, team_by_alt_name, team_by_name)
            totals["referees_created"] += referee_result["created"]
            totals["referees_updated"] += referee_result["updated"]
            session.commit()

            _update_progress(
                sync_admin,
                sync_log,
                "fights",
                _stage_progress(event_idx, len(event_items), 4, len(stage_order)),
                event_name,
            )
            fight_result = fight_service._sync_fights_list(
                fights,
                event_db_id,
                _athlete_uuid_map(session, event_db_id, athletes, teams),
                fight_service._build_wc_key_map(event_db_id),
            )
            totals["fights_created"] += fight_result["created"]
            totals["fights_updated"] += fight_result["updated"]
            session.commit()

        sync_log.events_created = totals["events_created"]
        sync_log.events_updated = totals["events_updated"]
        sync_log.teams_created = totals["teams_created"]
        sync_log.teams_updated = totals["teams_updated"]
        sync_log.weight_categories_created = totals["weight_categories_created"]
        sync_log.weight_categories_updated = totals["weight_categories_updated"]
        sync_log.athletes_created = totals["athletes_created"]
        sync_log.athletes_updated = totals["athletes_updated"]
        sync_log.referees_created = totals["referees_created"]
        sync_log.referees_updated = totals["referees_updated"]
        sync_log.fights_created = totals["fights_created"]
        sync_log.fights_updated = totals["fights_updated"]
        sync_log.status = "success"
        sync_log.finished_at = datetime.now(timezone.utc)
        sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
        sync_log.details = {
            **(sync_log.details or {}),
            "progress_percent": 100,
            "current_step": "completed",
            "total_events": len(event_id_by_arena_uuid),
        }
        session.add(sync_log)
        session.commit()
        sync_admin.cleanup_old_sync_logs()

        return {
            "message": f"Successfully synced {len(event_id_by_arena_uuid)} events via local agent",
            "sync_log_id": sync_log.id,
            **totals,
        }

    except HTTPException as exc:
        sync_admin.fail_sync_log(sync_log, start_time=start_time, error_message=str(exc.detail))
        raise
    except Exception as exc:
        session.rollback()
        sync_admin.fail_sync_log(sync_log, start_time=start_time, error_message=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Local sync failed: {exc}") from exc


@router.patch("/progress", response_model=dict)
async def patch_local_sync_progress(
    payload: dict[str, Any],
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Allow the local agent to report progress while reading Arena data."""
    token_payload = _decode_local_sync_token(_bearer_token(authorization))
    user_id = int(token_payload["sub"])
    sync_log_id = int(token_payload["sync_log_id"])

    sync_log = session.get(SyncLog, sync_log_id)
    if not sync_log or sync_log.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local sync run not found")
    if sync_log.status != "in_progress":
        return {"success": True}

    reported_progress = max(0, min(99, int(payload.get("progress_percent") or 0)))
    previous_progress = int((sync_log.details or {}).get("progress_percent") or 0)
    progress = max(previous_progress, reported_progress)
    current_step = str(payload.get("current_step") or "agent")
    current_event = payload.get("current_event")
    details = {
        **(sync_log.details or {}),
        "progress_percent": progress,
        "current_step": current_step,
    }
    if current_event:
        details["current_event"] = str(current_event)
    sync_log.details = details
    session.add(sync_log)
    session.commit()
    return {"success": True}
