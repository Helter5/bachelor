"""Public API - athletes (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from ...database import get_session
from ...domain.entities.athlete import Athlete
from ...domain.entities.person import Person
from ...domain.schemas.responses import AthleteOut
router = APIRouter(prefix="/athletes")


@router.get("", response_model=list[AthleteOut])
async def list_athletes(
    event_id: Optional[int] = None,
    team_id: Optional[int] = None,
    category_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    statement = (
        select(Athlete, Person)
        .outerjoin(Person, Athlete.person_id == Person.id)
    )

    if event_id:
        statement = statement.where(Athlete.sport_event_id == event_id)
    if team_id:
        statement = statement.where(Athlete.team_id == team_id)
    if category_id:
        statement = statement.where(Athlete.weight_category_id == category_id)

    statement = statement.offset(skip).limit(limit)
    results = session.exec(statement).all()

    out = []
    for athlete, person in results:
        out.append(AthleteOut(
            id=athlete.id,
            uid=athlete.uid,
            person_full_name=person.full_name if person else None,
            sport_event_id=athlete.sport_event_id,
            team_id=athlete.team_id,
            weight_category_id=athlete.weight_category_id,
            is_competing=athlete.is_competing,
            person_id=athlete.person_id,
            sync_timestamp=athlete.sync_timestamp,
        ))

    return out


@router.get("/{athlete_id}", response_model=AthleteOut)
async def get_athlete(athlete_id: int, session: Session = Depends(get_session)):
    result = session.exec(
        select(Athlete, Person)
        .outerjoin(Person, Athlete.person_id == Person.id)
        .where(Athlete.id == athlete_id)
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Athlete with id {athlete_id} not found"
        )

    athlete, person = result
    return AthleteOut(
        id=athlete.id,
        uid=athlete.uid,
        person_full_name=person.full_name if person else None,
        sport_event_id=athlete.sport_event_id,
        team_id=athlete.team_id,
        weight_category_id=athlete.weight_category_id,
        is_competing=athlete.is_competing,
        person_id=athlete.person_id,
        sync_timestamp=athlete.sync_timestamp,
    )
