"""
Weight Categories API Routes
Thin controller layer - delegates to WeightCategoryService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any
from sqlmodel import Session

from ..database import get_session
from ..services.weight_category_service import WeightCategoryService

router = APIRouter(prefix="/weight-category")


def get_service(session: Session = Depends(get_session)) -> WeightCategoryService:
    """Dependency injection for WeightCategoryService"""
    return WeightCategoryService(session)


@router.get("/{sport_event_id}")
async def get_weight_categories(
    sport_event_id: str,
    service: WeightCategoryService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch weight categories for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns weight categories data
    """
    try:
        return await service.get_weight_categories_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weight categories for event {sport_event_id}: {str(e)}"
        )


@router.get("/database/{sport_event_id}")
async def get_weight_categories_from_database(
    sport_event_id: int,
    service: WeightCategoryService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch weight categories for a specific sport event from local database

    Args:
        sport_event_id: Sport event database ID

    Returns weight categories from database
    """
    try:
        categories = service.get_weight_categories_by_event(sport_event_id)
        return {
            "success": True,
            "count": len(categories),
            "weight_categories": [
                {
                    "id": category.id,
                    "sport_event_id": category.sport_event_id,
                    "name": category.name,
                    "sport_name": category.sport_name,
                    "audience_name": category.audience_name,
                    "max_weight": category.max_weight,
                    "count_fighters": category.count_fighters,
                    "is_started": category.is_started,
                    "is_completed": category.is_completed,
                }
                for category in categories
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weight categories from database: {str(e)}"
        )


@router.post("/sync")
async def sync_weight_categories(
    sport_event_id: str = Query(..., description="Sport event UUID from Arena API"),
    service: WeightCategoryService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync weight categories for a sport event from Arena API to database

    Args:
        sport_event_id: Sport event UUID (from Arena API)

    Returns success message with count of synced weight categories
    """
    try:
        return await service.sync_weight_categories_for_event(sport_event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync weight categories: {str(e)}"
        )
