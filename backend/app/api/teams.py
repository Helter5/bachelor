"""
Teams API Routes
Thin controller layer - delegates to TeamService
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any
from sqlmodel import Session

from ..database import get_session
from ..services.team_service import TeamService

logger = logging.getLogger(__name__)
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
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch teams for event %s from Arena", sport_event_id)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "fetch_teams_arena_failed",
                "message": "Unable to fetch teams from Arena API",
            },
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
    except Exception:
        logger.exception("Failed to fetch teams from database for event %s", sport_event_id)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "fetch_teams_db_failed",
                "message": "Unable to fetch teams from database",
            },
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
    except Exception:
        logger.exception("Failed to sync teams for event %s", sport_event_id)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "sync_teams_failed",
                "message": "Unable to sync teams from Arena API",
            },
        )


@router.get("/{event_id}/print")
async def generate_teams_list_pdf(event_id: int, session: Session = Depends(get_session)):
    """Generate PDF with teams list for a specific sport event."""
    from fastapi.responses import Response
    from sqlmodel import select
    from ..domain import SportEvent, Team, Athlete
    from ..exports.documents.teams_list_export import generate_teams_list_pdf as _make_pdf

    try:
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Sport event {event_id} not found")

        teams = session.exec(select(Team).where(Team.sport_event_id == event_id)).all()
        athletes = session.exec(select(Athlete).where(Athlete.sport_event_id == event_id)).all()

        team_athlete_counts: dict = {}
        for a in athletes:
            if a.team_id is not None:
                team_athlete_counts[a.team_id] = team_athlete_counts.get(a.team_id, 0) + 1

        teams_data = sorted(
            [
                {
                    "name": t.name or "",
                    "alternateName": t.alternate_name or t.country_iso_code or "",
                    "athleteCount": team_athlete_counts.get(t.id, 0),
                }
                for t in teams
            ],
            key=lambda x: x["name"],
        )

        return Response(
            content=_make_pdf(event.name or "Sport Event", teams_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=teams-list-{event_id}.pdf"},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to generate teams PDF for event %s", event_id)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "teams_pdf_failed",
                "message": "Unable to generate teams PDF",
            },
        )
