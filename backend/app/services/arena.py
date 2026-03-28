from .arena_auth import get_access_token_for_source
from .arena_request import call_arena_api
from ..config import settings
from fastapi import HTTPException


async def fetch_arena_data(endpoint: str):
    """
    Universal function to fetch data from Arena API using the first enabled ArenaSource.

    Args:
        endpoint: API endpoint path (e.g., 'sport-event/', 'session/{sport_event_id}')

    Returns:
        API response data
    """
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
