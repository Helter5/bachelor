from typing import Optional, TYPE_CHECKING

from .arena_auth import get_access_token_for_source
from .arena_request import call_arena_api
from ..config import settings
from fastapi import HTTPException

if TYPE_CHECKING:
    from ..domain.entities.arena_source import ArenaSource


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
