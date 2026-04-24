"""Public API - event statistics."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ...database import get_session
from ...domain.schemas.responses import EventStatisticsOut
from ...services.event_statistics_service import EventStatisticsService

router = APIRouter(prefix="/events")


@router.get("/{event_id}/statistics", response_model=EventStatisticsOut)
def get_event_statistics(
    event_id: int,
    session: Session = Depends(get_session),
):
    """Get aggregated statistics for a sport event."""
    return EventStatisticsService(session).get_event_statistics(event_id)
