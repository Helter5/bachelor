"""
Public API - Weight Categories (no authentication required)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ...database import get_session
from ...domain import WeightCategory
from ...domain.entities.discipline import Discipline
from ...domain.schemas.responses import WeightCategoryOut

router = APIRouter(prefix="")


@router.get("/events/{event_id}/categories", response_model=List[WeightCategoryOut])
def get_weight_categories_by_event(
    event_id: int,
    session: Session = Depends(get_session)
):
    """
    Get all weight categories for a specific event from database

    Public endpoint - no authentication required
    """
    results = session.exec(
        select(WeightCategory, Discipline)
        .outerjoin(Discipline, WeightCategory.discipline_id == Discipline.id)
        .where(WeightCategory.sport_event_id == event_id)
    ).all()

    out = []
    for wc, discipline in results:
        out.append(WeightCategoryOut(
            id=wc.id,
            uid=wc.uid,
            name=wc.name,
            max_weight=wc.max_weight,
            count_fighters=wc.count_fighters,
            is_started=wc.is_started,
            is_completed=wc.is_completed,
            sport_event_id=wc.sport_event_id,
            discipline_id=wc.discipline_id,
            sport_name=discipline.sport_name if discipline else None,
            sport_id=discipline.sport_id if discipline else None,
            audience_name=discipline.audience_name if discipline else None,
            audience_id=discipline.audience_id if discipline else None,
            rounds_number=discipline.rounds_number if discipline else None,
            round_duration=discipline.round_duration if discipline else None,
            tournament_type=discipline.tournament_type if discipline else None,
            sync_timestamp=wc.sync_timestamp,
        ))

    return out
