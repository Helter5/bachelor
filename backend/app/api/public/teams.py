"""Public API - teams (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func, col
from typing import Optional

from ...database import get_session
from ...domain.entities.team import Team
from ...domain.entities.athlete import Athlete
from ...domain.schemas.responses import TeamOut

router = APIRouter(prefix="/teams")


@router.get("", response_model=list[TeamOut])
def list_teams(
    event_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    statement = select(Team)
    if event_id:
        statement = statement.where(Team.sport_event_id == event_id)

    teams = session.exec(statement.offset(skip).limit(limit)).all()

    # Count distinct persons per team (deduplicated — same person in multiple weight categories counts once)
    team_ids = [t.id for t in teams]
    person_counts: dict[int, int] = {}
    if team_ids:
        rows = session.exec(
            select(col(Athlete.team_id), func.count(func.distinct(Athlete.person_id)).label("cnt"))
            .where(col(Athlete.team_id).in_(team_ids))
            .where(col(Athlete.person_id).is_not(None))
            .group_by(col(Athlete.team_id))
        ).all()
        person_counts = {row[0]: row[1] for row in rows}

    result = []
    for team in teams:
        out = TeamOut.model_validate(team, from_attributes=True)
        out.athlete_count = person_counts.get(team.id, 0)
        result.append(out)
    return result


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, session: Session = Depends(get_session)):
    """Get specific team by ID (public, no auth required)"""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found",
        )
    return TeamOut.model_validate(team, from_attributes=True)
