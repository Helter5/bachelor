"""Fixtures for multi-Arena sync tests."""
import pytest
from sqlmodel import Session, select
from app.database import engine
from app.domain.entities.sport_event import SportEvent

EVENT_NAME = "Multi-Arena Test Cup"


@pytest.fixture(scope="session")
def db():
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="session")
def test_event(db):
    event = db.exec(select(SportEvent).where(SportEvent.name == EVENT_NAME)).first()
    assert event is not None, (
        f"'{EVENT_NAME}' not found in DB — run multi_arena_seed.py first"
    )
    return event
