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
        logger.error(f"Arena API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code,
                            detail=f"Arena API returned error: {e.response.text}")
    except httpx.RequestError as e:
        logger.error(f"Arena API request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request to Arena API failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in Arena API call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
