# Wrestling Federation Management System

A web application for managing a wrestling federation — athletes, teams, events, rankings, and results. Built as a bachelor thesis project.

---

## What it does

- Manages athletes, teams, clubs, coaches, and referees
- Tracks competition events, draws, results, and rankings
- Synchronizes data from UWW Arena (local competition software) to the web platform
- Generates exports (PDF, Excel) for events and rankings
- Role-based access: public read, authenticated admin write

---

## Repository structure

```
backend/           FastAPI application (Python)
frontend/          React application (TypeScript + Vite)
local-sync-agent/  Small bridge app — runs on the trainer's PC to connect Arena to the web app
arena/             UWW Arena test environment used during development
docker-compose.prod.yml
docker-compose.dev.yml
```

---

## Requirements

- Docker and Docker Compose
- A `.env` file in the project root (see below)

No other local dependencies are needed — everything runs in containers.

---

## Running locally (development)

```bash
git clone <repo-url>
cd bachelor

# Create your .env file (see .env reference below)
cp .env.example .env
# Edit .env with your values

docker compose -f docker-compose.dev.yml up --build
```

Services after startup:

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| pgAdmin  | http://localhost:5050      |

---

## Deploying to a server (production)

```bash
git clone <repo-url>
cd bachelor

# Create your .env file
nano .env

docker compose -f docker-compose.prod.yml up -d --build
```

The frontend is served on port `8088`. Put a reverse proxy in front of it and point your domain there. The backend is not exposed publicly — only the frontend container communicates with it over the internal Docker network.

Example Caddy configuration (`/etc/caddy/Caddyfile`):

```
yourdomain.com {
    reverse_proxy 172.17.0.1:8088
}
```

`172.17.0.1` is the standard Docker bridge IP on Linux. Replace with your server's Docker bridge IP if different.

To update after a code change:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## .env reference

```env
# Database
DATABASE_NAME=wrestling
DATABASE_USER=wrestling
DATABASE_PASSWORD=change_me
DATABASE_HOST=wf-db
DATABASE_PORT=5432

# JWT — generate a strong random secret
JWT_SECRET_KEY=change_me_to_random_string

# Frontend URL (used in emails and CORS)
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api

# Email (SMTP) — optional, set SEND_EMAILS=false to disable
SEND_EMAILS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your@email.com
SMTP_FROM_NAME=Wrestling Federation

# Google OAuth — optional
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Sync agent URL shown in the frontend
VITE_LOCAL_SYNC_AGENT_URL=http://127.0.0.1:8765
VITE_SYNC_MODE=
```

---

## Local Sync Agent

The sync agent is a small Python app that runs on the trainer's computer. It acts as a bridge between the web application and the locally running UWW Arena software.

```
web app --> http://127.0.0.1:8765 --> UWW Arena (localhost:8080) --> web backend
```

**Requirements on the trainer's PC:**

- Docker Desktop
- UWW Arena running and accessible at `http://localhost:8080`
- Internet connection (to reach the deployed web app)

**Setup:**

Download `local-sync-agent/docker-compose.yml` from this repository, then:

```bash
docker compose up -d
```

The agent will be available at `http://127.0.0.1:8765`. Keep it running while synchronizing.

**Before synchronizing, configure the Arena source in the web app:**

1. Open Settings: https://yourdomain.com/sk/dashboard/settings
2. Fill in the Arena connection:
   - Host: `localhost`
   - Port: `8080`
   - API Key, Client ID, Client Secret — find these inside UWW Arena:
     - Client ID + Secret: Settings → Apps → App ID / Secret
     - API Key: Settings → Users → API Key

Then click Synchronize in the web app. The agent contacts Arena on the trainer's machine and uploads the data to the backend.

---

## Running tests

Tests require a running database. Use the test profile:

```bash
docker compose -f docker-compose.dev.yml run --rm wf-tests
```

Or with a separate test env file:

```bash
docker compose --env-file .env --env-file .env.tests -f docker-compose.dev.yml run --rm wf-tests
```
