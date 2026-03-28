"""Protected Admin API - sync logs (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col
from typing import List

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.sync_log import SyncLog
from ....domain.schemas.responses import SyncLogOut
from ....core.dependencies import require_admin

router = APIRouter(prefix="/admin/sync-logs")


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
        select(SyncLog, User.username)
        .join(User, SyncLog.user_id == User.id)
        .order_by(col(SyncLog.started_at).desc())
        .limit(limit)
        .offset(offset)
    )

    results = session.exec(statement).all()

    logs = []
    for sync_log, username in results:
        log_dict = sync_log.model_dump()
        log_dict["username"] = username
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
        select(SyncLog, User.username)
        .join(User, SyncLog.user_id == User.id)
        .where(SyncLog.id == log_id)
    )

    result = session.exec(statement).first()

    if not result:
        raise HTTPException(status_code=404, detail="Sync log not found")

    sync_log, username = result
    log_dict = sync_log.model_dump()
    log_dict["username"] = username

    return SyncLogOut(**log_dict)
