from fastapi import APIRouter, HTTPException, Depends
from typing import List, Any, Dict
import logging

from app.core.dependencies import require_user
from app.domain.entities.user import User
from app.services.arena import fetch_arena_data

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/results/{sport_event_id}")
async def get_complete_results(
    sport_event_id: str,
    current_user: User = Depends(require_user)
) -> List[Any]:
    """
    Get complete results for a sport event from Arena API.
    """
    try:
        logger.info(f"Fetching results for sport event: {sport_event_id}")

        # Use the same fetch_arena_data function as other endpoints
        result = await fetch_arena_data(f"fight/{sport_event_id}/complete-results/text")

        logger.info(f"Successfully fetched results")

        return result

    except Exception as e:
        logger.error(f"Failed to fetch results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch results: {str(e)}")
