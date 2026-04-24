"""Public API - competitions/events (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import Optional

from ...database import get_session
from ...domain.entities.sport_event import SportEvent
from ...domain.schemas.responses import SportEventOut, SportEventListOut

router = APIRouter(prefix="/events")


@router.get("", response_model=SportEventListOut)
def list_events(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get list of sport events (public, no auth required)"""
    statement = select(SportEvent)
    if name:
        statement = statement.where(SportEvent.name.ilike(f"%{name}%"))

    count_statement = select(func.count()).select_from(SportEvent)
    if name:
        count_statement = count_statement.where(SportEvent.name.ilike(f"%{name}%"))

    total = session.exec(count_statement).one()
    events = session.exec(statement.offset(skip).limit(limit)).all()

    return SportEventListOut(
        items=[SportEventOut.model_validate(e, from_attributes=True) for e in events],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{event_id}", response_model=SportEventOut)
def get_event(event_id: int, session: Session = Depends(get_session)):
    """Get specific event by ID (public, no auth required)"""
    event = session.get(SportEvent, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )
    return SportEventOut.model_validate(event, from_attributes=True)
