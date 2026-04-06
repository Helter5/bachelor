"""
CI seed script: vytvorí ArenaSource a spustí sync priamo cez service layer.
Spúšťa sa PRED testami v CI pipeline — obchádza HTTP auth/CSRF.

Použitie:
    python tests/ci_seed.py
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
from app.services.fight_service import FightService


async def seed() -> None:
    with Session(engine) as session:

        # ── 1. ArenaSource ────────────────────────────────────────────────
        source = session.exec(
            select(ArenaSource).where(ArenaSource.is_enabled == True)
        ).first()

        if not source:
            source = ArenaSource(
                name="CI",
                host=os.environ["ARENA_HOST"],
                port=int(os.environ.get("ARENA_PORT", 8080)),
                client_id=os.environ.get("ARENA_CLIENT_ID"),
                client_secret=os.environ.get("ARENA_CLIENT_SECRET"),
                api_key=os.environ.get("ARENA_API_KEY"),
                is_enabled=True,
            )
            session.add(source)
            session.commit()
            session.refresh(source)
            print(f"[seed] ArenaSource vytvorený: {source.host}:{source.port}")
        else:
            print(f"[seed] ArenaSource existuje: {source.host}:{source.port}")

        # ── 2. Sport events ───────────────────────────────────────────────
        events = session.exec(select(SportEvent)).all()

        event_service = SportEventService(session)
        arena_data = await event_service.get_all_from_arena_source(source)
        events_list = arena_data.get("events", {}).get("items", [])

        if not events:
            print("[seed] Syncujem eventy...")
            print(f"[seed]   Nájdených {len(events_list)} eventov z Arény")

            for item in events_list:
                event_data = dict(item)
                mappings = {
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
                for camel, snake in mappings.items():
                    if camel in event_data:
                        event_data[snake] = event_data[camel]

                try:
                    event_data.pop("id", None)
                    event_base = SportEventBase(**event_data)
                    await event_service.sync_event(event_base)
                except Exception as e:
                    print(f"[seed]   CHYBA pri evente {event_data.get('name')}: {e}")

            session.commit()
            events = session.exec(select(SportEvent)).all()
            print(f"[seed]   {len(events)} eventov uložených do DB")
        else:
            print(f"[seed] DB už má {len(events)} eventov, preskakujem sync eventov")

        # Build UUID map: event.id → Arena UUID (needed for sub-entity sync calls)
        uuid_map: dict[int, str] = {}
        for item in events_list:
            arena_uuid = item.get("id")
            if not arena_uuid:
                continue
            for event in events:
                if (event.name == item.get("name") and
                        str(event.start_date) == str(item.get("startDate", "")) and
                        event.country_iso_code == item.get("countryIsoCode")):
                    uuid_map[event.id] = arena_uuid
                    break

        # ── 3. Kategórie + tímy + atléti pre každý event ─────────────────
        from app.domain.entities.athlete import Athlete
        has_athletes = session.exec(select(Athlete)).first() is not None

        if has_athletes:
            print("[seed] DB má atléti, preskakujem sync kategórií/tímov/atlétov")
        else:
            for event in events:
                arena_uuid = uuid_map.get(event.id)
                if not arena_uuid:
                    print(f"\n[seed] Preskakujem event '{event.name}' — UUID nenájdené v Arena source")
                    continue

                print(f"\n[seed] Event: {event.name}")

                wc_service = WeightCategoryService(session)
                r = await wc_service.sync_weight_categories_for_event(arena_uuid, event_id=event.id, source=source)
                print(f"[seed]   Kategórie: {r.get('synced_count', 0)} synced")

                team_service = TeamService(session)
                r = await team_service.sync_teams_for_event(arena_uuid, event_id=event.id, source=source)
                print(f"[seed]   Tímy: {r.get('synced_count', 0)} synced")

                athlete_service = AthleteService(session)
                r = await athlete_service.sync_athletes_for_event(arena_uuid, event_id=event.id, source=source)
                print(f"[seed]   Atléti: {r.get('synced_count', 0)} synced")

                fight_service = FightService(session)
                r = await fight_service.sync_fights_for_event(arena_uuid, event_id=event.id, source=source)
                print(f"[seed]   Zápasy: {r.get('synced_count', 0)} synced")

    print("\n[seed] Hotovo.")


if __name__ == "__main__":
    asyncio.run(seed())
