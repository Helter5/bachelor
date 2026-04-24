from typing import Optional, TYPE_CHECKING

from ..infrastructure.arena_gateway import ArenaGateway

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
    return await ArenaGateway(source).fetch_all_items(endpoint, items_key, source=source)


async def fetch_arena_data(endpoint: str, source: Optional["ArenaSource"] = None):
    """
    Fetch data from Arena API.

    If source is provided, use it directly (preferred — per-user sync).
    Otherwise fall back to the first enabled ArenaSource in the DB
    (used by public endpoints and legacy paths).
    """
    return await ArenaGateway(source).fetch_data(endpoint, source=source)
