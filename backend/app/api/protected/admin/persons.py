"""Protected Admin API - person merge (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select, col
from pydantic import BaseModel

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.person import Person
from ....domain.entities.athlete import Athlete
from ....core.dependencies import require_admin, validate_csrf_and_origin

router = APIRouter(prefix="/admin/persons")


class PersonMergeRequest(BaseModel):
    target_person_id: int
    source_person_ids: list[int]


class PersonMergeResponse(BaseModel):
    merged_count: int
    athletes_reassigned: int


@router.post("/merge", response_model=PersonMergeResponse)
async def merge_persons(
    body: PersonMergeRequest,
    request: Request,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
    _csrf: None = Depends(validate_csrf_and_origin),
):
    """
    Merge multiple person records into one.
    Reassigns all athletes from source persons to the target person,
    then deletes the source persons.

    Requires: Admin role + CSRF token
    """
    if not body.source_person_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_person_ids must not be empty",
        )

    if body.target_person_id in body.source_person_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_person_id must not be in source_person_ids",
        )

    # Validate target exists
    target = session.get(Person, body.target_person_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target person with id {body.target_person_id} not found",
        )

    # Validate all sources exist and have the same name as target
    source_persons = []
    for sid in body.source_person_ids:
        p = session.get(Person, sid)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source person with id {sid} not found",
            )
        if p.full_name != target.full_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Všetky osoby musia mať rovnaké meno. '{p.full_name}' sa nezhoduje s '{target.full_name}'",
            )
        source_persons.append(p)

    # Reassign athletes from source persons to the target
    athletes_to_reassign = session.exec(
        select(Athlete).where(col(Athlete.person_id).in_(body.source_person_ids))
    ).all()

    for athlete in athletes_to_reassign:
        athlete.person_id = body.target_person_id
        session.add(athlete)

    # Delete source persons
    for p in source_persons:
        session.delete(p)

    session.commit()

    return PersonMergeResponse(
        merged_count=len(source_persons),
        athletes_reassigned=len(athletes_to_reassign),
    )
