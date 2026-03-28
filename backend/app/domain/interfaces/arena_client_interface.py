"""Arena client interface - contract for external API integration"""
from typing import Protocol, Dict, Any


class IArenaClient(Protocol):
    """Arena API client interface - allows mocking for tests"""
    
    async def fetch_data(self, endpoint: str) -> Dict[str, Any]:
        """
        Fetch data from Arena API endpoint
        
        Args:
            endpoint: API endpoint path (e.g., "team/123")
        
        Returns:
            JSON response data
        """
        ...
    
    async def fetch_events(self) -> Dict[str, Any]:
        """Fetch all sport events"""
        ...
    
    async def fetch_teams(self, event_id: str) -> Dict[str, Any]:
        """Fetch teams for event"""
        ...
    
    async def fetch_athletes(self, event_id: str) -> Dict[str, Any]:
        """Fetch athletes for event"""
        ...
    
    async def fetch_weight_categories(self, event_id: str) -> Dict[str, Any]:
        """Fetch weight categories for event"""
        ...
