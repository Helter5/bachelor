"""Team Repository - data access for teams"""
from typing import List, Optional
from sqlmodel import Session, select
from uuid import UUID

from ..domain import Team
from .base_repository import BaseRepository


class TeamRepository(BaseRepository[Team]):
    """Repository for team data access"""
    
    def __init__(self, session: Session):
        super().__init__(session, Team)
    
    def get_by_event(self, sport_event_id: int) -> List[Team]:
        """Get all teams for a sport event"""
        statement = select(Team).where(Team.sport_event_id == sport_event_id)
        return list(self.session.exec(statement).all())
    
    def get_by_country(self, country_iso_code: str) -> List[Team]:
        """Get teams by country"""
        statement = select(Team).where(Team.country_iso_code == country_iso_code)
        return list(self.session.exec(statement).all())
    
    def upsert(self, team: Team) -> Team:
        """Create or update team by uid"""
        existing = self.get_by_uid(team.uid)
        
        if existing:
            # Update existing
            for key, value in team.dict(exclude={'id'}).items():
                setattr(existing, key, value)
            return self.update(existing)
        else:
            # Create new
            return self.create(team)
