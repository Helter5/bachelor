import httpx
import logging
from fastapi import HTTPException
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

async def call_arena_api(
    url: str,
    token: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
            logger.debug(f"Arena API request: {method.upper()} {url}")

            response = await client.request(
                method=method.upper(),
                url=url,
                headers=headers,
                data=data,
                json=json
            )
            response.raise_for_status()
            logger.debug(f"Arena API response: {response.status_code}")
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.exception("Arena API HTTP error %s for %s", e.response.status_code, url)
        # 404 must be preserved for callers that branch on it (e.g. weight categories).
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "arena_resource_not_found",
                    "message": "Requested resource was not found in Arena API",
                },
            )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "arena_api_error",
                "message": "Arena API returned an error",
            },
        )
    except httpx.RequestError:
        logger.exception("Arena API request error for %s", url)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "arena_network_failed",
                "message": "Cannot reach Arena API. Check the Arena source configuration.",
            },
        )
    except Exception:
        logger.exception("Unexpected error in Arena API call to %s", url)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "arena_unexpected",
                "message": "Unexpected error contacting Arena API",
            },
        )
