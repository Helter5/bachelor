"""
Shared fixtures for sync validation tests.
Run inside Docker: docker compose exec wf-api pytest
"""
import os
os.environ["SEND_EMAILS"] = "false"  # Disable email sending during tests

import pytest
from sqlmodel import Session, select

from app.database import engine
from app.domain.entities.sport_event import SportEvent
from app.services.arena import fetch_arena_data


@pytest.fixture(scope="session")
def db():
    """Session-scoped DB session — shared across all tests."""
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="session")
def synced_events(db):
    """All sport events that are already synced into the DB."""
    events = db.exec(select(SportEvent)).all()
    assert events, "Žiadne udalosti v DB — najskôr spusti sync podujatí"
    return events


async def arena_fetch(endpoint: str):
    """Helper — fetchne dáta z Arena API."""
    return await fetch_arena_data(endpoint)
