"""
Athletes API Routes
Thin controller layer - delegates to AthleteService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
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


@router.get("/{event_id}/print")
async def generate_athletes_list_pdf(event_id: int, session: Session = Depends(get_session)):
    """Generate PDF with athletes list for a specific sport event."""
    from fastapi.responses import Response
    from sqlmodel import select
    from ..domain import SportEvent, Athlete, Team, Person
    from ..exports.documents.athletes_list_export import generate_athletes_list_pdf as _make_pdf

    try:
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Sport event {event_id} not found")

        athletes = session.exec(select(Athlete).where(Athlete.sport_event_id == event_id)).all()

        # Deduplicate by person_id — same athlete can appear in multiple weight categories
        seen_persons: set[int] = set()
        unique_athletes = []
        for a in athletes:
            if a.person_id and a.person_id not in seen_persons:
                seen_persons.add(a.person_id)
                unique_athletes.append(a)

        person_ids = [a.person_id for a in unique_athletes if a.person_id]
        team_ids = list({a.team_id for a in unique_athletes if a.team_id})

        persons = session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []
        teams = session.exec(select(Team).where(Team.id.in_(team_ids))).all() if team_ids else []

        person_map = {p.id: p for p in persons}
        team_map = {t.id: t for t in teams}

        athletes_data = sorted(
            [
                {
                    "personFullName": person_map[a.person_id].full_name if a.person_id and person_map.get(a.person_id) else "",
                    "teamName": team_map[a.team_id].name if a.team_id and team_map.get(a.team_id) else "N/A",
                }
                for a in unique_athletes
            ],
            key=lambda x: x["personFullName"],
        )

        return Response(
            content=_make_pdf(event.name or "Sport Event", athletes_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=athletes-list-{event_id}.pdf"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
