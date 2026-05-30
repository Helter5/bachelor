import logging
from datetime import datetime
from urllib.parse import urlencode
import httpx
from fastapi import HTTPException

from ..core.http import get_http_client

logger = logging.getLogger(__name__)

_source_token_cache = {}


def invalidate_source_token_cache(source_id: int):
    """Remove cached token for a source (call on update or delete)."""
    _source_token_cache.pop(source_id, None)


async def get_access_token_for_source(source) -> str:
    """Return a cached or freshly requested access token for an Arena source."""
    source_id = source.id

    if source_id in _source_token_cache:
        cache = _source_token_cache[source_id]
        if cache["access_token"] and cache["expires_at"]:
            if datetime.now().timestamp() < cache["expires_at"]:
                logger.debug(f"Using cached access token for source {source_id}")
                return cache["access_token"]

    token_url = f"http://{source.host}:{source.port}/oauth/v2/token"

    api_key = source.api_key
    client_id = source.client_id
    client_secret = source.client_secret

    if not all([client_id, client_secret, api_key]):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "arena_credentials_missing",
                "message": "Arena source has no credentials configured (client_id, client_secret, api_key).",
            },
        )

    params = {
        "grant_type": "https://arena.uww.io/grants/api_key",
        "client_id": client_id,
        "client_secret": client_secret,
        "api_key": api_key,
    }

    try:
        logger.info(f"Requesting new access token from Arena source {source_id} ({source.host}:{source.port})")
        full_url = f"{token_url}?{urlencode(params)}"

        client = get_http_client()
        response = await client.post(full_url, timeout=30.0)
        response.raise_for_status()
        token_data = response.json()

        if "access_token" not in token_data:
            logger.error(f"Token response missing access_token field for source {source_id}")
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "arena_token_invalid_response",
                    "message": "Arena returned an invalid token response.",
                },
            )

        access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)

        _source_token_cache[source_id] = {
            "access_token": access_token,
            "expires_at": datetime.now().timestamp() + expires_in - 60
        }

        logger.info(f"Access token obtained for source {source_id}, expires in {expires_in}s")
        return access_token

    except httpx.RequestError:
        logger.exception("Token request failed for source %s", source_id)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "arena_token_network_failed",
                "message": "Cannot reach Arena authentication endpoint. Check the host and port.",
            },
        )
    except httpx.HTTPStatusError as e:
        logger.exception("Arena token API error for source %s: %s", source_id, e.response.status_code)
        raise HTTPException(
            status_code=e.response.status_code,
            detail={
                "code": "arena_token_rejected",
                "message": "Arena rejected the credentials. Verify client_id, client_secret and api_key.",
            },
        )
    except Exception:
        logger.exception("Unexpected error getting token for source %s", source_id)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "arena_token_unexpected",
                "message": "Unexpected error obtaining Arena access token.",
            },
        )
