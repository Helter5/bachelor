"""
Multi-Arena sync seed script.

Creates two ArenaSource entries and syncs 'Multi-Arena Test Cup' from each:
  - Arena A (port 8080): event aaaa... — teams only, NO athletes
  - Arena B (port 8081): event bbbb... — teams + 4 athletes (same name/date)

Both Arenas have independent UUIDs for the same real-world event.
The sync logic must deduplicate them into one event in the DB.

Usage (local):
    PYTHONPATH=/app python tests/multi_arena_seed.py

    Arena B env overrides (default: arena-host:8081):
    ARENA_B_HOST=arena-host ARENA_B_PORT=8081
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


EVENT_NAME = "Multi-Arena Test Cup"

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


async def seed() -> None:
    with Session(engine) as session:

        # Borrow credentials from the existing working source
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

        # Sync the test event from each Arena source independently
        for source in [source_a, source_b]:
            print(f"\n[multi-seed] === {source.name} ({source.host}:{source.port}) ===")

            event_service = SportEventService(session)
            try:
                arena_data = await event_service.get_all_from_arena_source(source)
            except Exception as e:
                print(f"[multi-seed] ERROR fetching events: {e}")
                continue

            events_list = arena_data.get("events", {}).get("items", [])
            test_events = [e for e in events_list if e.get("name") == EVENT_NAME]

            if not test_events:
                print(f"[multi-seed] WARNING: '{EVENT_NAME}' not found in {source.name}")
                continue

            arena_uuid = test_events[0].get("id")
            print(f"[multi-seed] Found '{EVENT_NAME}' (UUID: {arena_uuid})")

            mapped = dict(test_events[0])
            for camel, snake in EVENT_FIELD_MAP.items():
                if camel in mapped:
                    mapped[snake] = mapped[camel]
            try:
                await event_service.sync_event(SportEventBase(**mapped))
            except Exception as e:
                print(f"[multi-seed] ERROR syncing event: {e}")
                continue

            session.commit()

            db_event = session.exec(
                select(SportEvent).where(SportEvent.name == EVENT_NAME)
            ).first()
            if not db_event:
                print("[multi-seed] ERROR: event not in DB after sync")
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

    print("\n[multi-seed] Done.")


if __name__ == "__main__":
    asyncio.run(seed())
