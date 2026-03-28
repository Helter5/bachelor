"""Protected API module - requires authentication"""
from .admin import sync_router, users_router, arena_sources_router
from .profile import router as profile_router

__all__ = ["sync_router", "users_router", "arena_sources_router", "profile_router"]
