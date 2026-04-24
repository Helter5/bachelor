"""Public API - persons / wrestlers (no authentication required)"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing import Optional

from ...database import get_session
from ...domain.schemas.responses import PersonOut
from ...services.person_service import PersonService

router = APIRouter(prefix="/persons")


@router.get("", response_model=list[PersonOut])
def list_persons(
    name: Optional[str] = None,
    country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    return PersonService(session).list_persons(name=name, country=country, skip=skip, limit=limit)


@router.get("/compare")
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


@router.get("/{person_id}/opponents")
def get_person_opponents(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_opponents(person_id)


@router.get("/{person_id}/common-opponent-candidates")
def get_common_opponent_candidates(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_common_opponent_candidates(person_id)


@router.get("/{person_id}")
def get_person_detail(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_detail(person_id)


@router.get("/{person_id}/fights")
def get_person_fights(person_id: int, session: Session = Depends(get_session)):
    return PersonService(session).get_person_fights(person_id)
