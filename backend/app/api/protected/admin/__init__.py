"""Protected Admin API module - requires admin role"""
from .sync import router as sync_router
from .users import router as users_router
from .arena_sources import router as arena_sources_router
from .sync_logs import router as sync_logs_router
from .persons import router as persons_admin_router

__all__ = ["sync_router", "users_router", "arena_sources_router", "sync_logs_router", "persons_admin_router"]
