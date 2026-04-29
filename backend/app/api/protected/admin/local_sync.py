"""Protected Admin API for local-agent sync."""
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Request
from sqlmodel import Session

from ....core.dependencies import require_admin, validate_csrf_and_origin
from ....core.security import get_client_ip
from ....database import get_session
from ....domain.entities.user import User
from ....services.local_sync_service import LocalSyncService

router = APIRouter(prefix="/admin/local-sync")


@router.post("/start", response_model=dict)
async def start_local_sync(
    request: Request,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Create a local-agent sync run and return a short-lived upload token."""
    return LocalSyncService(session).start_sync(
        user=user,
        ip_address=get_client_ip(request),
    )


@router.post("/run", response_model=dict)
async def run_local_sync_upload(
    payload: dict[str, Any],
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Receive a full Arena data bundle from the local agent and sync it into the DB."""
    return await LocalSyncService(session).run_upload(payload, authorization)


@router.patch("/progress", response_model=dict)
async def patch_local_sync_progress(
    payload: dict[str, Any],
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Allow the local agent to report progress while reading Arena data."""
    return LocalSyncService(session).patch_progress(payload, authorization)
