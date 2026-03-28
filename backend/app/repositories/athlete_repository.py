"""Athlete Repository - data access for athletes"""
from typing import List, Optional
from sqlmodel import Session, select
from uuid import UUID

from ..domain import Athlete
from .base_repository import BaseRepository


class AthleteRepository:
    """
    Repository for athlete data access
    
    Uses composition (has-a BaseRepository), not inheritance (is-a)
    Implements IAthleteRepository interface
    """
    
    def __init__(self, session: Session):
        self.session = session
        self._base = BaseRepository(session, Athlete)  # Composition!
    
    # Delegate to base repository
    def get_by_id(self, id: int) -> Optional[Athlete]:
        return self._base.get_by_id(id)
    
    def get_by_uid(self, uid: UUID) -> Optional[Athlete]:
        return self._base.get_by_uid(uid)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[Athlete]:
        return self._base.get_all(skip, limit)
    
    def create(self, entity: Athlete) -> Athlete:
        return self._base.create(entity)
    
    def update(self, entity: Athlete) -> Athlete:
        return self._base.update(entity)
    
    def delete(self, entity: Athlete) -> None:
        return self._base.delete(entity)
    
    def count(self) -> int:
        return self._base.count()
    
    # Athlete-specific queries
    def get_by_event(self, sport_event_id: int, team_id: Optional[int] = None) -> List[Athlete]:
        """Get athletes by sport event, optionally filtered by team"""
        statement = select(Athlete).where(Athlete.sport_event_id == sport_event_id)
        
        if team_id is not None:
            statement = statement.where(Athlete.team_id == team_id)
        
        return list(self.session.exec(statement).all())
    
    def get_by_team(self, team_id: int) -> List[Athlete]:
        """Get all athletes for a team"""
        statement = select(Athlete).where(Athlete.team_id == team_id)
        return list(self.session.exec(statement).all())
    
    def get_by_weight_category(self, weight_category_id: int) -> List[Athlete]:
        """Get all athletes in a weight category"""
        statement = select(Athlete).where(Athlete.weight_category_id == weight_category_id)
        return list(self.session.exec(statement).all())
    
    def upsert(self, athlete: Athlete) -> Athlete:
        """Create or update athlete by uid"""
        existing = self.get_by_uid(athlete.uid)
        
        if existing:
            # Update existing
            for key, value in athlete.dict(exclude={'id'}).items():
                setattr(existing, key, value)
            return self.update(existing)
        else:
            # Create new
            return self.create(athlete)
