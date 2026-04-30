# Backend

FastAPI application serving the wrestling federation management system.

**Stack:** Python 3.12, FastAPI, SQLModel, PostgreSQL, Alembic, bcrypt, python-jose

---

## Directory structure

```
app/
  main.py              App entry point — registers all routers, CORS, middleware
  config.py            Settings loaded from environment variables
  database.py          Database engine and table initialization
  constants.py         Shared constants

  api/                 Route handlers
    auth/              Login, register, Google OAuth, password reset, email verification
    public/            Read-only endpoints, no auth required
    protected/         Requires authentication
      admin/           Admin-only operations (sync, users, arena sources)
      profile.py       Logged-in user's own profile

  domain/
    entities/          SQLModel ORM models (one file per database table)
    schemas/           Pydantic DTOs — request bodies and response shapes

  services/            Business logic, one service per domain area
  core/
    security.py        Password hashing, JWT creation and validation
    dependencies.py    FastAPI dependency injection (auth guards, current user)
    email.py           Email sending (verification, password reset)
    oauth.py           Google OAuth setup

  exports/             PDF and Excel document generation (reportlab, openpyxl)
  infrastructure/      External service adapters
  utils/               Shared helpers (country codes, etc.)
```

---

## API zones

The API is split into three zones based on access level:

| Zone | Prefix | Auth required | Who |
|---|---|---|---|
| Auth | `/api/v1/auth/` | No | Anyone — login, register |
| Public | `/api/v1/` | No | Anyone — read events, athletes, rankings |
| Protected | `/api/v1/` (guarded routes) | Yes | Logged-in users |
| Admin | `/api/v1/admin/` | Yes + admin role | Admins only |

Auth is enforced via FastAPI dependency injection in `core/dependencies.py`. Routes declare `require_user` or `require_admin` as a dependency.

---

## Key flows

**Authentication**
JWT-based. Access token (short-lived, in cookie) + refresh token (long-lived, stored hashed in DB). Rotation on every refresh. Reuse detection revokes all user tokens.

**Arena synchronization**
Two modes:
- Remote sync — backend fetches directly from an Arena instance configured in `arena_sources`
- Local sync — frontend contacts `local-sync-agent` running on the trainer's PC, agent pulls from Arena and POSTs the bundle to `/api/v1/admin/local-sync/run`

Sync logic lives in `services/admin_sync_service.py` and `services/local_sync_service.py`.

**Exports**
PDF and Excel generation triggered via `/api/v1/exports/`. Builders are in `exports/builders/`, each handling a specific document type (team lists, athlete lists, medals, results, statistics).

---

## Database migrations

Managed with Alembic:

```bash
cd backend
alembic upgrade head          # apply all migrations
alembic revision --autogenerate -m "description"  # generate new migration
```

On first startup, `create_db_and_tables()` in `database.py` creates tables if they don't exist.

---

## Running without Docker

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your .env
cp ../.env.example .env

uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

---

## Running tests

Tests are integration tests — they require a running PostgreSQL instance.

```bash
# Via Docker (recommended):
docker compose --env-file ../.env --env-file ../.env.tests -f ../docker-compose.dev.yml run --rm wf-tests

# Directly (with DB running):
PYTHONPATH=. pytest tests/ -v
```
