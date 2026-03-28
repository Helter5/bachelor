from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from ..services.arena import fetch_arena_data

router = APIRouter(prefix="/config")


@router.get("/sports")
async def get_sports_config() -> Dict[str, Any]:
    """
    Fetch sports configuration from Arena API

    Returns list of available sports with their configurations
    """
    try:
        return await fetch_arena_data("config/sports")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sports config: {str(e)}")


@router.get("/victory-types/{sport}")
async def get_victory_types(sport: str) -> Dict[str, Any]:
    """
    Fetch victory types for a specific sport from Arena API

    Args:
        sport: Sport identifier (e.g., "wrestling", "judo")

    Returns victory types configuration for the specified sport
    """
    try:
        return await fetch_arena_data(f"config/victory-types/{sport}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch victory types for {sport}: {str(e)}")
