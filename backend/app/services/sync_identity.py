"""Shared identity helpers for Arena sync services."""
import logging
from typing import Optional

from sqlmodel import Session, select

from ..domain.entities.person import Person


def resolve_person_id(
    session: Session,
    *,
    first_name: str,
    last_name: str,
    country_iso_code: Optional[str],
    logger: Optional[logging.Logger] = None,
) -> Optional[int]:
    """Find or create a person by the current sync natural key."""
    if not first_name and not last_name:
        return None

    country = (country_iso_code or "").strip() or None
    statement = select(Person).where(
        Person.first_name == first_name,
        Person.last_name == last_name,
        Person.country_iso_code == country,
    )
    person = session.exec(statement).first()
    if person:
        return person.id

    person = Person(
        first_name=first_name,
        last_name=last_name,
        country_iso_code=country,
    )
    session.add(person)
    session.flush()

    if logger:
        logger.info(f"Created new person: {first_name} {last_name} ({country or 'N/A'})")

    return person.id
