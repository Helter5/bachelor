from typing import Optional, TYPE_CHECKING

from .arena_auth import get_access_token_for_source
from .arena_request import call_arena_api
from ..config import settings
from fastapi import HTTPException

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource


async def fetch_all_arena_items(endpoint: str, items_key: str, source: Optional["ArenaSource"] = None) -> list:
    """
    Fetch all pages from a paginated Arena endpoint.

    Args:
        endpoint: Arena API endpoint (e.g. "athlete/{uuid}")
        items_key: Top-level key in response that contains the paginated object (e.g. "athletes")
        source: Optional ArenaSource to use

    Returns:
        Flat list of all items across all pages
    """
    import math

    data = await fetch_arena_data(endpoint, source=source)
    obj = data.get(items_key, {})

    if not isinstance(obj, dict):
        return obj if isinstance(obj, list) else []

    items: list = list(obj.get("items", []))
    total = obj.get("totalCount", len(items))
    per_page = obj.get("numItemsPerPage", len(items)) or len(items)

    if total > per_page and per_page > 0:
        sep = "&" if "?" in endpoint else "?"
        for page in range(2, math.ceil(total / per_page) + 1):
            page_data = await fetch_arena_data(f"{endpoint}{sep}page={page}", source=source)
            page_items = page_data.get(items_key, {}).get("items", [])
            items.extend(page_items)

    return items


async def fetch_arena_data(endpoint: str, source: Optional["ArenaSource"] = None):
    """
    Fetch data from Arena API.

    If source is provided, use it directly (preferred — per-user sync).
    Otherwise fall back to the first enabled ArenaSource in the DB
    (used by public endpoints and legacy paths).
    """
    if source is None:
        from sqlmodel import Session, select
        from ..database import engine
        from ..domain.entities.arena_source import ArenaSource

        with Session(engine) as session:
            source = session.exec(
                select(ArenaSource).where(ArenaSource.is_enabled == True)
            ).first()

        if not source:
            raise HTTPException(
                status_code=503,
                detail="Žiadny aktívny Arena zdroj nie je nakonfigurovaný. Pridajte ho v Settings → Arena Zdroje."
            )

    token = await get_access_token_for_source(source)
    url = f"http://{source.host}:{source.port}/api/{settings.arena_api_format}/{endpoint}"
    return await call_arena_api(url, token)
