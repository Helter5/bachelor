from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from datetime import datetime
import logging
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Nastavenie loggingu
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Wrestling Federation API - Test",
    description="Testing if Arena API works.",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # has to be changed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Arena API configuration from .env
ARENA_BASE_URL = os.getenv("ARENA_BASE_URL", "http://localhost:8080")
ARENA_CLIENT_ID = os.getenv("ARENA_CLIENT_ID", "")
ARENA_CLIENT_SECRET = os.getenv("ARENA_CLIENT_SECRET", "")
ARENA_API_KEY = os.getenv("ARENA_API_KEY", "")
ARENA_API_FORMAT = os.getenv("ARENA_API_FORMAT", "json")
DATA_OUTPUT_DIR = os.getenv("DATA_OUTPUT_DIR", "./data")

# Create data directory if it doesn't exist
Path(DATA_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Cache for OAuth token
_token_cache = {"access_token": None, "expires_at": None}


async def get_access_token() -> str:
    """Get OAuth2 access token using Arena's custom grant type"""
    # Check if we have a valid cached token
    if _token_cache["access_token"] and _token_cache["expires_at"]:
        if datetime.now().timestamp() < _token_cache["expires_at"]:
            return _token_cache["access_token"]

    # Request new token using Arena's custom grant
    async with httpx.AsyncClient() as client:
        token_url = f"{ARENA_BASE_URL}/oauth/v2/token"

        data = {
            "grant_type": "https://arena.uww.io/grants/api_key",
            "client_id": ARENA_CLIENT_ID,
            "client_secret": ARENA_CLIENT_SECRET,
            "api_key": ARENA_API_KEY,
        }

        response = await client.post(token_url, data=data)
        response.raise_for_status()

        token_data = response.json()
        access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)

        # Cache the token
        _token_cache["access_token"] = access_token
        _token_cache["expires_at"] = datetime.now().timestamp() + expires_in - 60  # 60s buffer

        logger.info("Successfully obtained OAuth2 access token")
        return access_token

@app.get("/")
async def root():
    """Basic endpoint"""
    return {
        "message": "Wrestling Federation API",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "arena_api_url": ARENA_BASE_URL
    }

@app.get("/test/sport-event")
async def test_sport_event():
    """Test sport-event endpoint and save data to JSON file"""
    try:
        # Get OAuth2 access token
        access_token = await get_access_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Construct the API URL
            api_url = f"{ARENA_BASE_URL}/api/{ARENA_API_FORMAT}/sport-event/"

            # Prepare headers with Bearer token
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }

            logger.info(f"Testing request to API: {api_url}")

            # Make the request
            response = await client.get(api_url, headers=headers)
            response.raise_for_status()

            data = response.json()

            # Save data to JSON file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = Path(DATA_OUTPUT_DIR) / f"sport_event_{timestamp}.json"

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            logger.info(f"Data saved to: {output_file}")

            return {
                "success": True,
                "message": "Sport event data retrieved and saved successfully",
                "api_url": api_url,
                "status_code": response.status_code,
                "output_file": str(output_file),
                "data_count": len(data) if isinstance(data, list) else 1,
                "timestamp": datetime.now().isoformat()
            }

    except httpx.HTTPError as e:
        logger.error(f"Error when calling API: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Arena API not communicating: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)