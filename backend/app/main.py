from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .core.dependencies import require_user
from .database import create_db_and_tables
from .config import get_settings as _get_settings

# Import new 3-zone API structure
from .api.auth import router as auth_router
from .api.public import events_router, athletes_router, teams_router, persons_router, rankings_router, event_statistics_router, draw_router, exports_router
from .api.public.weight_categories import router as weight_categories_router
from .api.public.results import router as results_router
from .api.protected.admin import sync_router, users_router, arena_sources_router, sync_logs_router, persons_admin_router
from .api.protected import profile_router

from .api import legacy_views, teams, athletes

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="Wrestling Federation API",
    version="2.0.0",
    description="3-Zone API: Public (no auth) | Auth (login/refresh) | Protected (admin only)",
    lifespan=lifespan,
)

def _cors_origins() -> list[str]:
    s = _get_settings()
    if s.allowed_origins:
        return [o.strip() for o in s.allowed_origins.split(",") if o.strip()]
    return [s.frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth_router, prefix="/api/v1")

# Data (requires authentication)
_auth = [Depends(require_user)]
app.include_router(events_router, prefix="/api/v1", dependencies=_auth)
app.include_router(athletes_router, prefix="/api/v1", dependencies=_auth)
app.include_router(teams_router, prefix="/api/v1", dependencies=_auth)
app.include_router(weight_categories_router, prefix="/api/v1", dependencies=_auth)
app.include_router(results_router, prefix="/api/v1", dependencies=_auth)
app.include_router(persons_router, prefix="/api/v1", dependencies=_auth)
app.include_router(rankings_router, prefix="/api/v1", dependencies=_auth)
app.include_router(event_statistics_router, prefix="/api/v1", dependencies=_auth)
app.include_router(draw_router, prefix="/api/v1", dependencies=_auth)

# Public exports (no auth required - for fans, coaches, etc.)
app.include_router(exports_router, prefix="/api/v1")

# Profile
app.include_router(profile_router, prefix="/api/v1")

# Admin
app.include_router(sync_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(arena_sources_router, prefix="/api/v1")
app.include_router(sync_logs_router, prefix="/api/v1")
app.include_router(persons_admin_router, prefix="/api/v1")

# Legacy routes
app.include_router(legacy_views.router)
app.include_router(teams.router)
app.include_router(athletes.router)

@app.get("/")
async def root():
    return {
        "message": "Wrestling Federation API v2.0",
        "zones": {
            "public": "/api/v1/public/* (no auth)",
            "auth": "/api/v1/auth/* (login/refresh/logout)",
            "admin": "/api/v1/admin/* (requires admin role)"
        },
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/version")
async def version():
    return {"version": app.version}
