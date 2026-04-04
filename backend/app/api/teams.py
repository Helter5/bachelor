"""
Teams API Routes
Thin controller layer - delegates to TeamService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any
from sqlmodel import Session

from ..database import get_session
from ..services.team_service import TeamService

router = APIRouter(prefix="/team")


def get_service(session: Session = Depends(get_session)) -> TeamService:
    """Dependency injection for TeamService"""
    return TeamService(session)


@router.get("/{sport_event_id}")
async def get_teams(
    sport_event_id: str,
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch teams for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns teams data for the specified sport event
    """
    try:
        return await service.get_teams_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch teams for event {sport_event_id}: {str(e)}"
        )


@router.get("/database/{sport_event_id}")
async def get_teams_from_database(
    sport_event_id: int,
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch teams for a specific sport event from local database

    Args:
        sport_event_id: Sport event database ID

    Returns teams from database
    """
    try:
        teams = service.get_teams_by_event(sport_event_id)
        # Return array directly (frontend expects Team[] with UUID as id)
        return [
            {
                "id": team.id,
                "sport_event_id": team.sport_event_id,
                "name": team.name,
                "alternate_name": team.alternate_name,
                "country_iso_code": team.country_iso_code,
                "athlete_count": team.athlete_count,
                "final_rank": team.final_rank,
            }
            for team in teams
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch teams from database: {str(e)}"
        )


@router.post("/sync")
async def sync_teams(
    sport_event_id: str = Query(..., description="Sport event UUID from Arena API"),
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync teams for a sport event from Arena API to database

    Args:
        sport_event_id: Sport event UUID (from Arena API)

    Returns success message with count of synced teams
    """
    try:
        return await service.sync_teams_for_event(sport_event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync teams: {str(e)}"
        )


@router.get("/{sportEventId}/print")
async def generate_teams_list_pdf(sportEventId: str):
    """Generate PDF with teams list for a specific sport event."""
    from fastapi.responses import Response
    from ..services.arena import fetch_arena_data
    from ..exports.documents.teams_list_export import generate_teams_list_pdf as _make_pdf

    try:
        event_data = await fetch_arena_data(f"sport-event/get/{sportEventId}")
        if not event_data or "event" not in event_data:
            raise HTTPException(status_code=404, detail=f"Sport event {sportEventId} not found")

        teams_data = await fetch_arena_data(f"team/{sportEventId}")
        if not teams_data or "sportEventTeams" not in teams_data:
            raise HTTPException(status_code=404, detail=f"Teams not found for event {sportEventId}")

        event_name = event_data["event"].get("fullName", "Sport Event")
        teams = sorted(teams_data["sportEventTeams"].get("items", []), key=lambda x: x.get("name", ""))

        return Response(
            content=_make_pdf(event_name, teams),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=teams-list-{sportEventId}.pdf"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
