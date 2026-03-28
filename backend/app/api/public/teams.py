"""Public API - teams (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from ...database import get_session
from ...domain.entities.team import Team
from ...domain.schemas.responses import TeamOut

router = APIRouter(prefix="/teams")


@router.get("", response_model=list[TeamOut])
async def list_teams(
    event_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    """
    Get list of teams (public, no auth required)
    
    Query parameters:
    - **event_id**: Filter by sport event
    - **skip**: Pagination offset
    - **limit**: Max records
    """
    statement = select(Team)
    
    if event_id:
        statement = statement.where(Team.sport_event_id == event_id)
    
    statement = statement.offset(skip).limit(limit)
    teams = session.exec(statement).all()
    
    return [TeamOut.model_validate(t, from_attributes=True) for t in teams]


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team_id: int, session: Session = Depends(get_session)):
    """
    Get specific team by ID (public, no auth required)
    """
    team = session.get(Team, team_id)
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    return TeamOut.model_validate(team, from_attributes=True)
