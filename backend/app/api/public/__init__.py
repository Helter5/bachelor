"""Public API module - no authentication required"""
from .events import router as events_router
from .athletes import router as athletes_router
from .teams import router as teams_router
from .persons import router as persons_router
from .rankings import router as rankings_router
from .event_statistics import router as event_statistics_router
from .draw import router as draw_router

__all__ = ["events_router", "athletes_router", "teams_router", "persons_router", "rankings_router", "event_statistics_router", "draw_router"]
