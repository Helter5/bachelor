"""Repository interfaces - contracts for data access"""
from typing import Protocol, TypeVar, List, Optional, runtime_checkable
from uuid import UUID

T = TypeVar('T')


@runtime_checkable
class IBaseRepository(Protocol[T]):
    """Base repository interface - contract for CRUD operations"""
    
    def get_by_id(self, id: int) -> Optional[T]:
        """Get entity by primary key"""
        ...
    
    def get_by_uid(self, uid: UUID) -> Optional[T]:
        """Get entity by UUID"""
        ...
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        ...
    
    def create(self, entity: T) -> T:
        """Create new entity"""
        ...
    
    def update(self, entity: T) -> T:
        """Update existing entity"""
        ...
    
    def delete(self, entity: T) -> None:
        """Delete entity"""
        ...
    
    def count(self) -> int:
        """Count total entities"""
        ...


@runtime_checkable
class IAthleteRepository(Protocol):
    """Athlete repository interface"""
    
    def get_by_id(self, id: int) -> Optional['Athlete']:
        ...
    
    def get_by_uid(self, uid: UUID) -> Optional['Athlete']:
        ...
    
    def get_by_event(self, sport_event_id: int, team_id: Optional[int] = None) -> List['Athlete']:
        """Get athletes by sport event, optionally filtered by team"""
        ...
    
    def get_by_team(self, team_id: int) -> List['Athlete']:
        """Get all athletes for a team"""
        ...
    
    def get_by_weight_category(self, weight_category_id: int) -> List['Athlete']:
        """Get all athletes in a weight category"""
        ...
    
    def upsert(self, athlete: 'Athlete') -> 'Athlete':
        """Create or update athlete by uid"""
        ...


@runtime_checkable
class ITeamRepository(Protocol):
    """Team repository interface"""
    
    def get_by_id(self, id: int) -> Optional['Team']:
        ...
    
    def get_by_uid(self, uid: UUID) -> Optional['Team']:
        ...
    
    def get_by_event(self, sport_event_id: int) -> List['Team']:
        """Get all teams for a sport event"""
        ...
    
    def get_by_country(self, country_iso_code: str) -> List['Team']:
        """Get teams by country"""
        ...
    
    def upsert(self, team: 'Team') -> 'Team':
        """Create or update team by uid"""
        ...


@runtime_checkable
class ISportEventRepository(Protocol):
    """Sport event repository interface"""
    
    def get_by_id(self, id: int) -> Optional['SportEvent']:
        ...
    
    def get_by_uuid(self, uuid: str) -> Optional['SportEvent']:
        """Get event by Arena UUID"""
        ...
    
    def get_visible_events(self) -> List['SportEvent']:
        """Get all visible events"""
        ...
    
    def get_sync_enabled_events(self) -> List['SportEvent']:
        """Get events with sync enabled"""
        ...
    
    def upsert(self, event: 'SportEvent') -> 'SportEvent':
        """Create or update event by uuid"""
        ...


@runtime_checkable
class IWeightCategoryRepository(Protocol):
    """Weight category repository interface"""
    
    def get_by_id(self, id: int) -> Optional['WeightCategory']:
        ...
    
    def get_by_uid(self, uid: UUID) -> Optional['WeightCategory']:
        ...
    
    def get_by_event(self, sport_event_id: int) -> List['WeightCategory']:
        """Get all weight categories for a sport event"""
        ...
    
    def get_started_categories(self, sport_event_id: int) -> List['WeightCategory']:
        """Get started weight categories for an event"""
        ...
    
    def get_completed_categories(self, sport_event_id: int) -> List['WeightCategory']:
        """Get completed weight categories for an event"""
        ...
    
    def upsert(self, category: 'WeightCategory') -> 'WeightCategory':
        """Create or update weight category by uid"""
        ...
