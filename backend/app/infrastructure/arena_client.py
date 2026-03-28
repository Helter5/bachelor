"""
Arena API Client - Infrastructure layer implementation
Implements IArenaClient interface
"""
from typing import Dict, Any
import httpx
import logging

from ..domain.interfaces import IArenaClient
from ..config import get_settings

logger = logging.getLogger(__name__)


class ArenaClient:
    """
    Arena API client implementation
    
    Infrastructure layer - concrete implementation of IArenaClient interface
    This can be easily mocked/replaced for testing
    """
    
    def __init__(self, host: str, port: int):
        self.settings = get_settings()
        self.base_url = f"http://{host}:{port}"
        self.timeout = 30.0
    
    async def fetch_data(self, endpoint: str) -> Dict[str, Any]:
        """Fetch data from Arena API endpoint"""
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Arena API error for {endpoint}: {str(e)}")
                raise
    
    async def fetch_events(self) -> Dict[str, Any]:
        """Fetch all sport events"""
        return await self.fetch_data("event")
    
    async def fetch_teams(self, event_id: str) -> Dict[str, Any]:
        """Fetch teams for event"""
        return await self.fetch_data(f"team/{event_id}")
    
    async def fetch_athletes(self, event_id: str) -> Dict[str, Any]:
        """Fetch athletes for event"""
        return await self.fetch_data(f"athlete/{event_id}")
    
    async def fetch_weight_categories(self, event_id: str) -> Dict[str, Any]:
        """Fetch weight categories for event"""
        return await self.fetch_data(f"weight_category/{event_id}")
