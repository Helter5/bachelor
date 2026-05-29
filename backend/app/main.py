import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .api.auth import router as auth_router
from .api.protected import profile_router
from .api.protected.admin import sync_router, users_router, arena_sources_router, sync_logs_router, local_sync_router
from .api.public import events_router, athletes_router, teams_router, persons_router, referees_router, rankings_router, event_statistics_router, draw_router, exports_router
from .api.public.results import router as results_router
from .api.public.weight_categories import router as weight_categories_router
from .config import get_settings as _get_settings
from .core.dependencies import require_user, require_admin
from .database import create_db_and_tables


class _HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "GET /health" not in record.getMessage()


logging.getLogger("uvicorn.access").addFilter(_HealthCheckFilter())

limiter = Limiter(key_func=get_remote_address)
_settings = _get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="Wrestling Federation API",
    version="2.0.0",
    description="API with auth routes, authenticated application data routes, and admin-only routes",
    lifespan=lifespan,
    docs_url="/docs" if _settings.app_debug else None,
    redoc_url="/redoc" if _settings.app_debug else None,
    openapi_url="/openapi.json" if _settings.app_debug else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

def _cors_origins() -> list[str]:
    s = _settings
    if s.allowed_origins:
        return [o.strip() for o in s.allowed_origins.split(",") if o.strip()]
    return [s.frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router, prefix="/api/v1")

_auth = [Depends(require_user)]
app.include_router(events_router, prefix="/api/v1", dependencies=_auth)
app.include_router(athletes_router, prefix="/api/v1", dependencies=_auth)
app.include_router(teams_router, prefix="/api/v1", dependencies=_auth)
app.include_router(weight_categories_router, prefix="/api/v1", dependencies=_auth)
app.include_router(results_router, prefix="/api/v1", dependencies=_auth)
app.include_router(persons_router, prefix="/api/v1", dependencies=_auth)
app.include_router(referees_router, prefix="/api/v1", dependencies=_auth)
app.include_router(rankings_router, prefix="/api/v1", dependencies=_auth)
app.include_router(event_statistics_router, prefix="/api/v1", dependencies=_auth)
app.include_router(draw_router, prefix="/api/v1", dependencies=_auth)

app.include_router(exports_router, prefix="/api/v1", dependencies=_auth)

app.include_router(profile_router, prefix="/api/v1")

_admin = [Depends(require_admin)]
app.include_router(sync_router, prefix="/api/v1", dependencies=_admin)
app.include_router(users_router, prefix="/api/v1", dependencies=_admin)
app.include_router(arena_sources_router, prefix="/api/v1", dependencies=_admin)
app.include_router(sync_logs_router, prefix="/api/v1", dependencies=_admin)
# local_sync has mixed auth: /start uses require_admin, /run and /progress use upload token
app.include_router(local_sync_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/version")
async def version():
    return {"version": app.version}
