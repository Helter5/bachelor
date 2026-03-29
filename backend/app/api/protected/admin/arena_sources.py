"""Protected Admin API - arena sources management (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.arena_source import ArenaSource, ArenaSourceBase
from ....domain.schemas.responses import ArenaSourceOut
from ....core.dependencies import require_admin, validate_csrf_and_origin
from ....services.arena_auth import invalidate_source_token_cache

router = APIRouter(prefix="/admin/arena-sources")


@router.get("", response_model=List[ArenaSourceOut])
async def list_arena_sources(
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get all arena sources (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    statement = select(ArenaSource)
    sources = session.exec(statement).all()
    return sources


@router.post("", response_model=ArenaSourceOut, status_code=status.HTTP_201_CREATED)
async def create_arena_source(
    source_data: ArenaSourceBase,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Create new arena source (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = ArenaSource(**source_data.model_dump(), user_id=user.id)
    session.add(source)
    session.commit()
    session.refresh(source)
    return source


@router.get("/{source_id}", response_model=ArenaSourceOut)
async def get_arena_source(
    source_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get specific arena source by ID (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = session.get(ArenaSource, source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arena source with id {source_id} not found"
        )
    return source


@router.put("/{source_id}", response_model=ArenaSourceOut)
async def update_arena_source(
    source_id: int,
    source_data: ArenaSourceBase,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update arena source (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = session.get(ArenaSource, source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arena source with id {source_id} not found"
        )

    # Invalidate cached token so new credentials take effect immediately
    invalidate_source_token_cache(source_id)

    # Update fields
    for key, value in source_data.model_dump(exclude_unset=True).items():
        setattr(source, key, value)

    session.add(source)
    session.commit()
    session.refresh(source)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_arena_source(
    source_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Delete arena source (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = session.get(ArenaSource, source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arena source with id {source_id} not found"
        )

    invalidate_source_token_cache(source_id)
    session.delete(source)
    session.commit()
    return None


@router.post("/{source_id}/test", response_model=dict)
async def test_arena_source(
    source_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Test connection to arena source (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = session.get(ArenaSource, source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arena source with id {source_id} not found"
        )

    # Test connection to Arena API
    from ....services.arena_auth import get_access_token_for_source
    from ....services.arena_request import call_arena_api

    try:
        # Try to get access token
        token = await get_access_token_for_source(source)

        # Try to fetch events
        url = f"http://{source.host}:{source.port}/api/json/sport-event/"
        response = await call_arena_api(url, token)

        return {
            "success": True,
            "message": "Successfully connected to Arena instance",
            "events_count": response.get("events", {}).get("totalCount", 0)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to connect: {str(e)}"
        }


@router.post("/{source_id}/toggle", response_model=ArenaSourceOut)
async def toggle_arena_source(
    source_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Toggle arena source enabled/disabled (admin only)

    Requires: Admin role + CSRF token + Origin validation
    """
    source = session.get(ArenaSource, source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arena source with id {source_id} not found"
        )

    source.is_enabled = not source.is_enabled
    session.add(source)
    session.commit()
    session.refresh(source)
    return source
