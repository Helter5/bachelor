"""Public API - draw/seeding generator"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from ...database import get_session
from ...services.draw_service import DrawService

router = APIRouter(prefix="/draw")


@router.get("/{event_id}/{weight_category_id}")
async def generate_draw(
    event_id: int,
    weight_category_id: int,
    last_n: int = Query(3, ge=1, le=10, description="Number of recent tournaments for seeding score"),
    session: Session = Depends(get_session),
):
    """Generate a seeded bracket for a weight category with penalty-based optimization."""
    service = DrawService(session)
    return service.generate_draw(event_id, weight_category_id, last_n)
