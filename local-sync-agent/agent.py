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


async def report_progress(
    client: httpx.AsyncClient,
    server_url: str,
    upload_token: str,
    current_step: str,
    progress_percent: int,
    current_event: str | None = None,
) -> None:
    try:
        payload: dict[str, Any] = {
            "current_step": current_step,
            "progress_percent": progress_percent,
        }
        if current_event:
            payload["current_event"] = current_event
        await client.patch(
            f"{server_url.rstrip('/')}/api/v1/admin/local-sync/progress",
            json=payload,
            headers={"Authorization": f"Bearer {upload_token}"},
        )
    except Exception as exc:
        logger.warning("Could not report progress: %s", exc)


def collect_progress(event_index: int, event_total: int, stage_index: int, stage_total: int) -> int:
    if event_total <= 0 or stage_total <= 0:
        return 2
    completed_units = (event_index * stage_total) + stage_index
    total_units = event_total * stage_total
    return min(45, 2 + int((completed_units / total_units) * 43))


async def build_bundle(request: SyncRequest, progress_client: httpx.AsyncClient) -> dict[str, Any]:
    source = request.arena_source
    server_url = request.server_url.rstrip("/")
    async with httpx.AsyncClient(timeout=60.0) as client:
        await report_progress(progress_client, server_url, request.upload_token, "agent", 2)
        token = await get_arena_token(client, source)
        await report_progress(progress_client, server_url, request.upload_token, "events", 5)
        events = await fetch_all_items(client, source, token, "sport-event/", "events")
        event_payloads: dict[str, dict[str, Any]] = {}
        stage_order = ["teams", "categories", "athletes", "referees", "fights"]

        for event_index, event in enumerate(events):
            event_uuid = event.get("id")
            if not event_uuid:
                continue
            event_name = event.get("name")

            await report_progress(
                progress_client,
                server_url,
                request.upload_token,
                "categories",
                collect_progress(event_index, len(events), 0, len(stage_order)),
                event_name,
            )
            category_data = await fetch_arena_json(client, source, token, f"weight-category/{event_uuid}")
            await report_progress(
                progress_client,
                server_url,
                request.upload_token,
                "fights",
                collect_progress(event_index, len(events), 1, len(stage_order)),
                event_name,
            )
            fight_data = await fetch_arena_json(client, source, token, f"fight/{event_uuid}")

            await report_progress(
                progress_client,
                server_url,
                request.upload_token,
                "teams",
                collect_progress(event_index, len(events), 2, len(stage_order)),
                event_name,
            )
            teams = await fetch_all_items(client, source, token, f"team/{event_uuid}", "sportEventTeams")
            await report_progress(
                progress_client,
                server_url,
                request.upload_token,
                "athletes",
                collect_progress(event_index, len(events), 3, len(stage_order)),
                event_name,
            )
            athletes = await fetch_all_items(client, source, token, f"athlete/{event_uuid}", "athletes")
            await report_progress(
                progress_client,
                server_url,
                request.upload_token,
                "referees",
                collect_progress(event_index, len(events), 4, len(stage_order)),
                event_name,
            )
            referees = await fetch_all_items(client, source, token, f"referee/{event_uuid}", "referees")

            event_payloads[str(event_uuid)] = {
                "teams": teams,
                "categories": category_data.get("weightCategories", []),
                "athletes": athletes,
                "referees": referees,
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
        server_url = request.server_url.rstrip("/")
        timeout = httpx.Timeout(600.0, connect=30.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            bundle = await build_bundle(request, client)
            logger.info(
                "Arena bundle ready: %s events, %s event payloads",
                len(bundle.get("events", [])),
                len(bundle.get("event_payloads", {})),
            )
            await report_progress(client, server_url, request.upload_token, "agent", 48)
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
