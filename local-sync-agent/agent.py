"""Local BP sync agent.

Runs on the trainer's computer, reads their local UWW Arena, and uploads the
data bundle to the deployed BP backend.
"""
from typing import Any
from urllib.parse import urlencode
import logging
import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


logger = logging.getLogger("bp-local-sync-agent")

app = FastAPI(title="BP Local Sync Agent", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_private_network_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


class ArenaSource(BaseModel):
    host: str
    port: int = 8080
    client_id: str
    client_secret: str
    api_key: str


class SyncRequest(BaseModel):
    server_url: str
    upload_token: str
    arena_source: ArenaSource


def arena_base_url(source: ArenaSource) -> str:
    host = os.getenv("BP_ARENA_HOST_OVERRIDE") or source.host
    host = host.replace("http://", "").replace("https://", "").strip("/")
    return f"http://{host}:{source.port}"


async def get_arena_token(client: httpx.AsyncClient, source: ArenaSource) -> str:
    params = {
        "grant_type": "https://arena.uww.io/grants/api_key",
        "client_id": source.client_id,
        "client_secret": source.client_secret,
        "api_key": source.api_key,
    }
    url = f"{arena_base_url(source)}/oauth/v2/token?{urlencode(params)}"
    try:
        response = await client.post(url)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Arena token request failed: {exc.response.status_code} {exc.response.text[:500]}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Arena token request failed at {url}: {type(exc).__name__}: {exc}") from exc
    data = response.json()
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Arena token response did not include access_token")
    return token


async def fetch_arena_json(client: httpx.AsyncClient, source: ArenaSource, token: str, endpoint: str) -> dict[str, Any]:
    url = f"{arena_base_url(source)}/api/json/{endpoint}"
    try:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if response.status_code == 404 or (endpoint.startswith("fight/") and response.status_code == 500):
            return {}
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Arena API request failed at {url}: {exc.response.status_code} {exc.response.text[:500]}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Arena API request failed at {url}: {type(exc).__name__}: {exc}") from exc
    return response.json()


async def fetch_all_items(
    client: httpx.AsyncClient,
    source: ArenaSource,
    token: str,
    endpoint: str,
    items_key: str,
) -> list[dict[str, Any]]:
    data = await fetch_arena_json(client, source, token, endpoint)
    obj = data.get(items_key, {})

    if isinstance(obj, list):
        return obj
    if not isinstance(obj, dict):
        return []

    items = list(obj.get("items", []))
    total = obj.get("totalCount", len(items))
    per_page = obj.get("numItemsPerPage", len(items)) or len(items)

    if total > per_page and per_page > 0:
        sep = "&" if "?" in endpoint else "?"
        pages = (total + per_page - 1) // per_page
        for page in range(2, pages + 1):
            page_data = await fetch_arena_json(client, source, token, f"{endpoint}{sep}page={page}")
            page_items = page_data.get(items_key, {}).get("items", [])
            items.extend(page_items)

    return items


async def build_bundle(source: ArenaSource) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        token = await get_arena_token(client, source)
        events = await fetch_all_items(client, source, token, "sport-event/", "events")
        event_payloads: dict[str, dict[str, Any]] = {}

        for event in events:
            event_uuid = event.get("id")
            if not event_uuid:
                continue

            category_data = await fetch_arena_json(client, source, token, f"weight-category/{event_uuid}")
            fight_data = await fetch_arena_json(client, source, token, f"fight/{event_uuid}")

            event_payloads[str(event_uuid)] = {
                "teams": await fetch_all_items(client, source, token, f"team/{event_uuid}", "sportEventTeams"),
                "categories": category_data.get("weightCategories", []),
                "athletes": await fetch_all_items(client, source, token, f"athlete/{event_uuid}", "athletes"),
                "referees": await fetch_all_items(client, source, token, f"referee/{event_uuid}", "referees"),
                "fights": fight_data.get("fights", []),
            }

        return {
            "events": events,
            "event_payloads": event_payloads,
        }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sync")
async def sync(request: SyncRequest) -> dict[str, Any]:
    try:
        logger.info("Starting local sync from Arena %s:%s", request.arena_source.host, request.arena_source.port)
        bundle = await build_bundle(request.arena_source)
        logger.info(
            "Arena bundle ready: %s events, %s event payloads",
            len(bundle.get("events", [])),
            len(bundle.get("event_payloads", {})),
        )
        server_url = request.server_url.rstrip("/")
        timeout = httpx.Timeout(600.0, connect=30.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            upload_url = f"{server_url}/api/v1/admin/local-sync/run"
            logger.info("Uploading local sync bundle to %s", upload_url)
            response = await client.post(
                upload_url,
                json=bundle,
                headers={"Authorization": f"Bearer {request.upload_token}"},
            )
            response.raise_for_status()
            return response.json()
    except HTTPException as exc:
        logger.error("Local sync failed: %s", exc.detail)
        raise
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        logger.error("Server upload failed: %s %s", exc.response.status_code, detail[:1000])
        raise HTTPException(
            status_code=502,
            detail=f"Server upload failed: {exc.response.status_code} {detail[:1000]}",
        ) from exc
    except httpx.RequestError as exc:
        logger.error("Server upload request failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Server upload request failed: {type(exc).__name__}: {exc}",
        ) from exc
