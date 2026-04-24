"""Protected Admin API - sync logs (requires admin role)"""
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, col
from typing import List

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.sync_log import SyncLog
from ....domain.schemas.responses import SyncLogOut
from ....core.dependencies import require_admin

router = APIRouter(prefix="/admin/sync-logs")


class SyncLogStatsPatch(BaseModel):
    teams_created: int | None = None
    teams_updated: int | None = None
    athletes_created: int | None = None
    athletes_updated: int | None = None
    weight_categories_created: int | None = None
    weight_categories_updated: int | None = None
    fights_created: int | None = None
    fights_updated: int | None = None
    referees_created: int | None = None
    referees_updated: int | None = None
    status: str | None = None
    error_message: str | None = None
    details: Dict[str, Any] | None = None


@router.get("", response_model=List[SyncLogOut])
async def get_sync_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get sync logs with pagination (admin only)

    Returns sync logs ordered by started_at DESC (most recent first)
    """
    statement = (
        select(SyncLog, User.username, User.first_name, User.last_name)
        .join(User, SyncLog.user_id == User.id)
        .order_by(col(SyncLog.started_at).desc())
        .limit(limit)
        .offset(offset)
    )

    results = session.exec(statement).all()

    logs = []
    for sync_log, username, first_name, last_name in results:
        log_dict = sync_log.model_dump()
        log_dict["username"] = username
        full_name = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip()
        log_dict["user_full_name"] = full_name or None
        logs.append(SyncLogOut(**log_dict))

    return logs


@router.get("/{log_id}", response_model=SyncLogOut)
async def get_sync_log(
    log_id: int,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get detailed sync log by ID (admin only)
    """
    statement = (
        select(SyncLog, User.username, User.first_name, User.last_name)
        .join(User, SyncLog.user_id == User.id)
        .where(SyncLog.id == log_id)
    )

    result = session.exec(statement).first()

    if not result:
        raise HTTPException(status_code=404, detail="Sync log not found")

    sync_log, username, first_name, last_name = result
    log_dict = sync_log.model_dump()
    log_dict["username"] = username
    full_name = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip()
    log_dict["user_full_name"] = full_name or None

    return SyncLogOut(**log_dict)


@router.patch("/{log_id}/stats", response_model=SyncLogOut)
async def patch_sync_log_stats(
    log_id: int,
    payload: SyncLogStatsPatch,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Patch sync log progress/statistics (admin only)."""
    statement = (
        select(SyncLog, User.username, User.first_name, User.last_name)
        .join(User, SyncLog.user_id == User.id)
        .where(SyncLog.id == log_id)
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Sync log not found")

    sync_log, username, first_name, last_name = result

    field_updates = {
        "teams_created": payload.teams_created,
        "teams_updated": payload.teams_updated,
        "athletes_created": payload.athletes_created,
        "athletes_updated": payload.athletes_updated,
        "weight_categories_created": payload.weight_categories_created,
        "weight_categories_updated": payload.weight_categories_updated,
        "fights_created": payload.fights_created,
        "fights_updated": payload.fights_updated,
        "referees_created": payload.referees_created,
        "referees_updated": payload.referees_updated,
    }
    for field, value in field_updates.items():
        if value is not None:
            setattr(sync_log, field, value)

    if payload.error_message is not None:
        sync_log.error_message = payload.error_message

    if payload.details is not None:
        existing = sync_log.details or {}
        sync_log.details = {**existing, **payload.details}

    if payload.status is not None:
        sync_log.status = payload.status
        if payload.status == "in_progress":
            sync_log.finished_at = None
            sync_log.duration_seconds = None
        elif payload.status in {"success", "failed"}:
            if sync_log.finished_at is None:
                sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.duration_seconds = int((sync_log.finished_at - sync_log.started_at).total_seconds())

    session.add(sync_log)
    session.commit()
    session.refresh(sync_log)

    log_dict = sync_log.model_dump()
    log_dict["username"] = username
    full_name = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip()
    log_dict["user_full_name"] = full_name or None
    return SyncLogOut(**log_dict)
