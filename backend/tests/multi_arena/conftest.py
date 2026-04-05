"""Fixtures for multi-Arena sync tests."""
import asyncio
import pytest
from sqlmodel import Session, select

from app.database import engine
from app.domain.entities.sport_event import SportEvent
from app.domain.entities.arena_source import ArenaSource

MULTI_CUP_NAME = "Multi-Arena Test Cup"
EXCLUSIVE_CUP_NAME = "Arena C Exclusive Cup"


@pytest.fixture(scope="session")
def db():
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="session")
def multi_cup(db):
    event = db.exec(select(SportEvent).where(SportEvent.name == MULTI_CUP_NAME)).first()
    assert event is not None, (
        f"'{MULTI_CUP_NAME}' not found in DB — run multi_arena_seed.py first"
    )
    return event


# Backward-compatible alias used by existing tests
@pytest.fixture(scope="session")
def test_event(multi_cup):
    return multi_cup


@pytest.fixture(scope="session")
def exclusive_cup(db):
    event = db.exec(select(SportEvent).where(SportEvent.name == EXCLUSIVE_CUP_NAME)).first()
    assert event is not None, (
        f"'{EXCLUSIVE_CUP_NAME}' not found in DB — run multi_arena_seed.py first"
    )
    return event


@pytest.fixture(scope="session")
def source_a(db):
    s = db.exec(
        select(ArenaSource).where(ArenaSource.name == "Arena A (multi-test)")
    ).first()
    assert s is not None, "Arena A source not found — run multi_arena_seed.py first"
    return s


@pytest.fixture(scope="session")
def source_b(db):
    s = db.exec(
        select(ArenaSource).where(ArenaSource.name == "Arena B (multi-test)")
    ).first()
    assert s is not None, "Arena B source not found — run multi_arena_seed.py first"
    return s


@pytest.fixture(scope="session")
def source_c(db):
    s = db.exec(
        select(ArenaSource).where(ArenaSource.name == "Arena C (multi-test)")
    ).first()
    assert s is not None, "Arena C source not found — run multi_arena_seed.py first"
    return s


def resolve_uuid(event_name: str, source: ArenaSource) -> str | None:
    """Return the Arena UUID for event_name in the given source, or None if not found.
    Mirrors the _resolve_event_uuid_for_source logic in sync.py."""
    from app.services.arena_auth import get_access_token_for_source
    from app.services.arena_request import call_arena_api

    async def _resolve():
        try:
            token = await get_access_token_for_source(source)
            url = f"http://{source.host}:{source.port}/api/json/sport-event/"
            data = await call_arena_api(url, token)
            for item in data.get("events", {}).get("items", []):
                if item.get("name") == event_name:
                    return str(item["id"])
            return None
        except Exception:
            return None

    return asyncio.run(_resolve())
