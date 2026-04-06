"""
Multi-Arena sync seed script (3 sources).

Creates three ArenaSource entries and syncs test events from each:
  - Arena A (port 8080): "Multi-Arena Test Cup" — teams only, NO athletes
  - Arena B (port 8081): "Multi-Arena Test Cup" — teams + 4 athletes
  - Arena C (port 8082): "Multi-Arena Test Cup" — adds AUSTRIA team + 2 new athletes
                         "Arena C Exclusive Cup" — unique event, only in Arena C

Sync order: A → B → C
After seeding, the app DB must contain exactly 2 events (natural-key deduplication).

Usage (local):
    PYTHONPATH=/app python tests/multi_arena_seed.py

    Env overrides (defaults shown):
    ARENA_HOST=arena-host   ARENA_PORT=8080
    ARENA_B_HOST=arena-host ARENA_B_PORT=8081
    ARENA_C_HOST=arena-host ARENA_C_PORT=8082
"""
import asyncio
import os
from sqlmodel import Session, select

from app.database import engine
from app.domain.entities.arena_source import ArenaSource
from app.domain.entities.sport_event import SportEvent
from app.domain import SportEventBase
from app.services.sport_event_service import SportEventService
from app.services.weight_category_service import WeightCategoryService
from app.services.team_service import TeamService
from app.services.athlete_service import AthleteService


# Only sync these events — avoids touching real production data in the seed Arena
TEST_EVENT_NAMES = {"Multi-Arena Test Cup", "Arena C Exclusive Cup"}

EVENT_FIELD_MAP = {
    "startDate": "start_date",
    "endDate": "end_date",
    "addressLocality": "address_locality",
    "isIndividualEvent": "is_individual_event",
    "isTeamEvent": "is_team_event",
    "isBeachWrestlingTournament": "is_beach_wrestling",
    "tournamentType": "tournament_type",
    "eventType": "event_type",
    "isSyncEnabled": "is_sync_enabled",
    "countryIsoCode": "country_iso_code",
}


async def seed_from_source(session: Session, source: ArenaSource) -> None:
    print(f"\n[multi-seed] === {source.name} ({source.host}:{source.port}) ===")

    event_service = SportEventService(session)
    try:
        arena_data = await event_service.get_all_from_arena_source(source)
    except Exception as e:
        print(f"[multi-seed] ERROR fetching events: {e}")
        return

    events_list = arena_data.get("events", {}).get("items", [])
    test_events = [e for e in events_list if e.get("name") in TEST_EVENT_NAMES]

    if not test_events:
        print(f"[multi-seed] WARNING: no test events found in {source.name}")
        return

    for arena_event in test_events:
        arena_uuid = arena_event.get("id")
        event_name = arena_event.get("name")
        print(f"[multi-seed] Syncing '{event_name}' (UUID: {arena_uuid})")

        mapped = dict(arena_event)
        for camel, snake in EVENT_FIELD_MAP.items():
            if camel in mapped:
                mapped[snake] = mapped[camel]
        mapped.pop("id", None)
        try:
            await event_service.sync_event(SportEventBase(**mapped))
        except Exception as e:
            print(f"[multi-seed] ERROR syncing event: {e}")
            continue
        session.commit()

        db_event = session.exec(
            select(SportEvent).where(SportEvent.name == event_name)
        ).first()
        if not db_event:
            print(f"[multi-seed] ERROR: '{event_name}' not in DB after sync")
            continue

        wc_service = WeightCategoryService(session)
        r = await wc_service.sync_weight_categories_for_event(
            arena_uuid, event_id=db_event.id, source=source
        )
        print(f"[multi-seed] WCs: {r.get('synced_count', 0)} synced")

        team_service = TeamService(session)
        r = await team_service.sync_teams_for_event(
            arena_uuid, event_id=db_event.id, source=source
        )
        print(f"[multi-seed] Teams: {r.get('synced_count', 0)} synced")

        athlete_service = AthleteService(session)
        r = await athlete_service.sync_athletes_for_event(
            arena_uuid, event_id=db_event.id, source=source
        )
        print(f"[multi-seed] Athletes: {r.get('synced_count', 0)} synced")


async def seed() -> None:
    with Session(engine) as session:
        # Borrow credentials from an existing source (CI sets them via env)
        ref = session.exec(
            select(ArenaSource).where(ArenaSource.is_enabled == True)
        ).first()
        creds = {
            "client_id":     (ref.client_id     if ref else None) or os.environ.get("ARENA_CLIENT_ID"),
            "client_secret": (ref.client_secret if ref else None) or os.environ.get("ARENA_CLIENT_SECRET"),
            "api_key":       (ref.api_key       if ref else None) or os.environ.get("ARENA_API_KEY"),
        }

        def get_or_create_source(name: str, host: str, port: int) -> ArenaSource:
            existing = session.exec(
                select(ArenaSource).where(ArenaSource.name == name)
            ).first()
            if existing:
                print(f"[multi-seed] ArenaSource '{name}' exists ({host}:{port})")
                return existing
            source = ArenaSource(name=name, host=host, port=port, is_enabled=True, **creds)
            session.add(source)
            session.commit()
            session.refresh(source)
            print(f"[multi-seed] Created ArenaSource '{name}' ({host}:{port})")
            return source

        source_a = get_or_create_source(
            "Arena A (multi-test)",
            os.environ.get("ARENA_HOST", "arena-host"),
            int(os.environ.get("ARENA_PORT", 8080)),
        )
        source_b = get_or_create_source(
            "Arena B (multi-test)",
            os.environ.get("ARENA_B_HOST", "arena-host"),
            int(os.environ.get("ARENA_B_PORT", 8081)),
        )
        source_c = get_or_create_source(
            "Arena C (multi-test)",
            os.environ.get("ARENA_C_HOST", "arena-host"),
            int(os.environ.get("ARENA_C_PORT", 8082)),
        )

        for source in [source_a, source_b, source_c]:
            await seed_from_source(session, source)

    print("\n[multi-seed] Done.")


if __name__ == "__main__":
    asyncio.run(seed())
