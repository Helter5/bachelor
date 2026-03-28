"""Weight Category Repository - data access for weight categories"""
from typing import List, Optional
from sqlmodel import Session, select
from uuid import UUID

from ..domain import WeightCategory
from .base_repository import BaseRepository


class WeightCategoryRepository(BaseRepository[WeightCategory]):
    """Repository for weight category data access"""
    
    def __init__(self, session: Session):
        super().__init__(session, WeightCategory)
    
    def get_by_event(self, sport_event_id: int) -> List[WeightCategory]:
        """Get all weight categories for a sport event"""
        statement = select(WeightCategory).where(WeightCategory.sport_event_id == sport_event_id)
        return list(self.session.exec(statement).all())
    
    def get_started_categories(self, sport_event_id: int) -> List[WeightCategory]:
        """Get started weight categories for an event"""
        statement = select(WeightCategory).where(
            WeightCategory.sport_event_id == sport_event_id,
            WeightCategory.is_started == True
        )
        return list(self.session.exec(statement).all())
    
    def get_completed_categories(self, sport_event_id: int) -> List[WeightCategory]:
        """Get completed weight categories for an event"""
        statement = select(WeightCategory).where(
            WeightCategory.sport_event_id == sport_event_id,
            WeightCategory.is_completed == True
        )
        return list(self.session.exec(statement).all())
    
    def upsert(self, category: WeightCategory) -> WeightCategory:
        """Create or update weight category by uid"""
        existing = self.get_by_uid(category.uid)
        
        if existing:
            # Update existing
            for key, value in category.dict(exclude={'id'}).items():
                setattr(existing, key, value)
            return self.update(existing)
        else:
            # Create new
            return self.create(category)
