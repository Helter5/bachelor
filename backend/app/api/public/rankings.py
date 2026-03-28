"""Public API - rankings (no authentication required)"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing import Optional

from ...database import get_session
from ...services.ranking_service import RankingService

router = APIRouter(prefix="/rankings")


@router.get("/categories")
async def get_ranking_categories(session: Session = Depends(get_session)):
    """Get available weight categories that have fight data."""
    service = RankingService(session)
    return service.get_available_weight_categories()


@router.get("")
async def get_ranking(
    weight_category: str = Query(..., description="Weight category name"),
    last_n: int = Query(3, ge=1, le=10, description="Number of most recent tournaments to consider"),
    date_from: Optional[str] = Query(None, description="Filter tournaments from this date (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
):
    """Get wrestler ranking for a specific weight category."""
    service = RankingService(session)
    return service.get_ranking(weight_category, last_n, date_from)
