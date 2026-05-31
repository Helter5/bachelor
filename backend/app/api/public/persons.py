"""Person and wrestler analysis endpoints for authenticated application users."""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing import Optional

from ...database import get_session
from ...domain.schemas.responses import PersonOut, PersonRefOut
from ...services.person_service import PersonService

router = APIRouter(prefix="/persons")


@router.get("", response_model=list[PersonOut])
def list_persons(
    name: Optional[str] = Query(None, max_length=100),
    country: Optional[str] = Query(None, max_length=10),
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    return PersonService(session).list_persons(name=name, country=country, skip=skip, limit=limit)


@router.get("/compare", response_model=dict)
def compare_persons(
    person1_id: int = Query(...),
    person2_id: int = Query(...),
    include_fights: bool = Query(False),
    include_common_opponents: bool = Query(False),
    session: Session = Depends(get_session),
):
    return PersonService(session).compare_persons(
        person1_id=person1_id,
        person2_id=person2_id,
        include_fights=include_fights,
        include_common_opponents=include_common_opponents,
    )


@router.get("/{person_id}/opponents", response_model=list[PersonRefOut])
def get_person_opponents(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_opponents(person_id)


@router.get("/{person_id}/common-opponent-candidates", response_model=list[PersonRefOut])
def get_common_opponent_candidates(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_common_opponent_candidates(person_id)


@router.get("/{person_id}", response_model=dict)
def get_person_detail(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_detail(person_id)


@router.get("/{person_id}/fights", response_model=dict)
def get_person_fights(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_fights(person_id)
