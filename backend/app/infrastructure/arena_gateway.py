"""Gateway for Arena API access."""
import math
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from ..config import settings
from ..database import engine
from ..domain.entities.arena_source import ArenaSource
from ..domain.entities.sport_event import SportEvent
from ..services.arena_auth import get_access_token_for_source
from ..services.arena_request import call_arena_api


class ArenaGateway:
    """Adapter around Arena auth, request, pagination, and source resolution."""

    def __init__(self, source: Optional[ArenaSource] = None):
        self.source = source

    async def fetch_data(self, endpoint: str, source: Optional[ArenaSource] = None):
        """Fetch data from Arena API using the provided or resolved source."""
        resolved_source = source or self.source or self._get_default_source()
        token = await get_access_token_for_source(resolved_source)
        url = f"http://{resolved_source.host}:{resolved_source.port}/api/{settings.arena_api_format}/{endpoint}"
        return await call_arena_api(url, token)

    async def fetch_all_items(
        self,
        endpoint: str,
        items_key: str,
        source: Optional[ArenaSource] = None,
    ) -> list:
        """Fetch all pages from a paginated Arena endpoint."""
        data = await self.fetch_data(endpoint, source=source)
        obj = data.get(items_key, {})

        if not isinstance(obj, dict):
            return obj if isinstance(obj, list) else []

        items: list = list(obj.get("items", []))
        total = obj.get("totalCount", len(items))
        per_page = obj.get("numItemsPerPage", len(items)) or len(items)

        if total > per_page and per_page > 0:
            sep = "&" if "?" in endpoint else "?"
            for page in range(2, math.ceil(total / per_page) + 1):
                page_data = await self.fetch_data(f"{endpoint}{sep}page={page}", source=source)
                page_items = page_data.get(items_key, {}).get("items", [])
                items.extend(page_items)

        return items

    async def list_events(self, source: Optional[ArenaSource] = None) -> list[dict]:
        """Return raw Arena event items for a source."""
        data = await self.fetch_data("sport-event/", source=source)
        return data.get("events", {}).get("items", [])

    async def resolve_event_uuid_for_source(
        self,
        event: SportEvent,
        source: Optional[ArenaSource] = None,
    ) -> Optional[str]:
        """Resolve a local event to the Arena UUID for the given source."""
        items = await self.list_events(source=source)
        for item in items:
            if (
                item.get("name") == event.name
                and item.get("startDate") == str(event.start_date)
                and item.get("countryIsoCode") == event.country_iso_code
            ):
                return str(item["id"])
        return None

    @staticmethod
    def _get_default_source() -> ArenaSource:
        """Fallback to the first enabled Arena source for legacy/public flows."""
        with Session(engine) as session:
            source = session.exec(
                select(ArenaSource).where(ArenaSource.is_enabled.is_(True))
            ).first()

        if not source:
            raise HTTPException(
                status_code=503,
                detail="Žiadny aktívny Arena zdroj nie je nakonfigurovaný. Pridajte ho v Settings → Arena Zdroje."
            )

        return source
