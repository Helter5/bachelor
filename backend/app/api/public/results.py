"""Public API - results (no authentication required)"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Any
import logging

from ...services.arena import fetch_arena_data

router = APIRouter(prefix="/results")
logger = logging.getLogger(__name__)


@router.get("/{event_uuid}", response_model=List[Any])
async def get_results(event_uuid: str):
    """
    Get fight results for an event from Arena API (public, no auth required)

    Path parameters:
    - **event_uuid**: UUID of the event in Arena system
    """
    try:
        logger.info(f"Fetching results for event: {event_uuid}")
        result = await fetch_arena_data(f"fight/{event_uuid}/complete-results/text")
        logger.info(f"Successfully fetched {len(result) if isinstance(result, list) else 'unknown'} results")
        return result
    except Exception as e:
        logger.error(f"Failed to fetch results for event {event_uuid}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch results: {str(e)}"
        )
