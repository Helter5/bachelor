"""Public API - referees (authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from ...database import get_session
from ...domain.entities.referee import Referee
from ...domain.entities.person import Person
from ...domain.entities.team import Team
from ...domain.schemas.responses import RefereeOut
from ...utils.country_codes import normalize_country_iso_code

router = APIRouter(prefix="/referees")


def _build_referee_out(referee: Referee, person: Optional[Person], team: Optional[Team]) -> RefereeOut:
    return RefereeOut(
        id=referee.id,
        person_full_name=person.full_name if person else None,
        country_iso_code=normalize_country_iso_code(person.country_iso_code) if person else None,
        team_name=team.name if team else None,
        team_alternate_name=team.alternate_name if team else None,
        number=referee.number,
        referee_level=referee.referee_level,
        referee_group=referee.referee_group,
        delegate=referee.delegate,
        matchairman=referee.matchairman,
        is_referee=referee.is_referee,
        preferred_style=referee.preferred_style,
        mat_name=referee.mat_name,
        deactivated=referee.deactivated,
    )


@router.get("", response_model=list[RefereeOut])
async def list_referees(
    event_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    """Get referees for an event"""
    statement = (
        select(Referee, Person, Team)
        .outerjoin(Person, Referee.person_id == Person.id)
        .outerjoin(Team, Referee.team_id == Team.id)
    )

    if event_id:
        statement = statement.where(Referee.sport_event_id == event_id)

    statement = statement.offset(skip).limit(limit)
    results = session.exec(statement).all()

    return [_build_referee_out(referee, person, team) for referee, person, team in results]


@router.get("/{referee_id}", response_model=RefereeOut)
async def get_referee(referee_id: int, session: Session = Depends(get_session)):
    """Get a specific referee"""
    result = session.exec(
        select(Referee, Person, Team)
        .outerjoin(Person, Referee.person_id == Person.id)
        .outerjoin(Team, Referee.team_id == Team.id)
        .where(Referee.id == referee_id)
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referee with id {referee_id} not found"
        )

    referee, person, team = result
    return _build_referee_out(referee, person, team)
