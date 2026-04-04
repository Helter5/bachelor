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
    """
    All sport events synced into DB, enriched with .arena_uuid resolved
    from Arena API via natural key (name + start_date + country_iso_code).
    """
    events = db.exec(select(SportEvent)).all()
    assert events, "Žiadne udalosti v DB — najskôr spusti sync podujatí"

    # Resolve Arena UUID for each event via natural key
    import asyncio

    async def _resolve():
        from app.services.arena import fetch_arena_data as _fetch
        data = await _fetch("sport-event/")
        return data.get("events", {}).get("items", [])

    arena_items = asyncio.get_event_loop().run_until_complete(_resolve())

    uuid_map: dict[int, str] = {}
    for item in arena_items:
        arena_uuid = item.get("id")
        if not arena_uuid:
            continue
        for event in events:
            if (event.name == item.get("name") and
                    str(event.start_date) == str(item.get("startDate", "")) and
                    event.country_iso_code == item.get("countryIsoCode")):
                uuid_map[event.id] = arena_uuid
                break

    # Attach arena_uuid as a runtime attribute (not persisted to DB)
    for event in events:
        object.__setattr__(event, "arena_uuid", uuid_map.get(event.id))

    return events


async def arena_fetch(endpoint: str):
    """Helper — fetchne dáta z Arena API."""
    return await fetch_arena_data(endpoint)
