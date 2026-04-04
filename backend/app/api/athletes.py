"""
Athletes API Routes
Thin controller layer - delegates to AthleteService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from uuid import UUID
from sqlmodel import Session

from ..database import get_session
from ..services.athlete_service import AthleteService

router = APIRouter(prefix="/athlete")


def get_service(session: Session = Depends(get_session)) -> AthleteService:
    """Dependency injection for AthleteService"""
    return AthleteService(session)


@router.get("/{sport_event_id}")
async def get_athletes(
    sport_event_id: str,
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch athletes for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns athletes data
    """
    try:
        return await service.get_athletes_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch athletes for event {sport_event_id}: {str(e)}"
        )


@router.get("/database/all")
async def get_all_athletes_from_database(
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch all athletes from local database with related data

    Returns all athletes with team and weight category information
    """
    try:
        athletes_with_data = service.get_all_with_details()
        return {
            "success": True,
            "count": len(athletes_with_data),
            "athletes": athletes_with_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch all athletes from database: {str(e)}"
        )


@router.get("/database/{sport_event_id}")
async def get_athletes_from_database(
    sport_event_id: int,
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch athletes for a specific sport event from local database

    Args:
        sport_event_id: Sport event database ID
        team_id: Optional team ID to filter by

    Returns athletes from database
    """
    try:
        athletes_with_teams = service.get_athletes_by_event_with_teams(sport_event_id, team_id)

        return {
            "success": True,
            "count": len(athletes_with_teams),
            "athletes": [
                {
                    "id": athlete["id"],
                    "sport_event_id": athlete["sport_event_id"],
                    "person_full_name": athlete["person_full_name"],
                    "team_id": athlete["team_id"],
                    "weight_category_id": athlete["weight_category_id"],
                    "is_competing": athlete["is_competing"],
                }
                for athlete in athletes_with_teams
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch athletes from database: {str(e)}"
        )


@router.post("/sync")
async def sync_athletes(
    sport_event_id: str = Query(..., description="Sport event UUID from Arena API"),
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync athletes for a sport event from Arena API to database

    Args:
        sport_event_id: Sport event UUID (from Arena API)

    Returns success message with count of synced athletes
    """
    try:
        return await service.sync_athletes_for_event(sport_event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync athletes: {str(e)}"
        )


@router.get("/{sportEventId}/print")
async def generate_athletes_list_pdf(sportEventId: str):
    """Generate PDF with athletes list for a specific sport event."""
    from fastapi.responses import Response
    from ..services.arena import fetch_arena_data
    from ..exports.documents.athletes_list_export import generate_athletes_list_pdf as _make_pdf

    try:
        event_data = await fetch_arena_data(f"sport-event/get/{sportEventId}")
        if not event_data or "event" not in event_data:
            raise HTTPException(status_code=404, detail=f"Sport event {sportEventId} not found")

        athletes_data = await fetch_arena_data(f"athlete/{sportEventId}")
        if not athletes_data or "athletes" not in athletes_data:
            raise HTTPException(status_code=404, detail=f"Athletes not found for event {sportEventId}")

        event_name = event_data["event"].get("fullName", "Sport Event")
        athletes = sorted(athletes_data["athletes"].get("items", []), key=lambda x: x.get("personFullName", ""))

        return Response(
            content=_make_pdf(event_name, athletes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=athletes-list-{sportEventId}.pdf"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
