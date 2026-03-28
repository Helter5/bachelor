"""Sport Event Repository - data access for sport events"""
from typing import List, Optional
from sqlmodel import Session, select
from datetime import datetime

from ..domain import SportEvent
from .base_repository import BaseRepository


class SportEventRepository(BaseRepository[SportEvent]):
    """Repository for sport event data access"""
    
    def __init__(self, session: Session):
        super().__init__(session, SportEvent)
    
    def get_by_arena_uuid(self, arena_uuid: str) -> Optional[SportEvent]:
        """Get event by Arena UUID"""
        statement = select(SportEvent).where(SportEvent.arena_uuid == arena_uuid)
        return self.session.exec(statement).first()

    def get_by_natural_key(self, name: str, start_date: str, country_iso_code: str) -> Optional[SportEvent]:
        """Get event by natural key (name, start_date, country_iso_code)"""
        statement = select(SportEvent).where(
            SportEvent.name == name,
            SportEvent.start_date == start_date,
            SportEvent.country_iso_code == country_iso_code
        )
        return self.session.exec(statement).first()

    def get_visible_events(self) -> List[SportEvent]:
        """Get all visible events"""
        statement = select(SportEvent).where(SportEvent.visible == True)
        return list(self.session.exec(statement).all())

    def get_sync_enabled_events(self) -> List[SportEvent]:
        """Get events with sync enabled"""
        statement = select(SportEvent).where(SportEvent.is_sync_enabled == True)
        return list(self.session.exec(statement).all())

    def get_by_date_range(self, start_date: str, end_date: str) -> List[SportEvent]:
        """Get events within date range"""
        statement = select(SportEvent).where(
            SportEvent.start_date >= start_date,
            SportEvent.end_date <= end_date
        )
        return list(self.session.exec(statement).all())

    def upsert(self, event: SportEvent) -> SportEvent:
        """Create or update event by natural key"""
        existing = self.get_by_natural_key(
            event.name,
            event.start_date or "",
            event.country_iso_code or ""
        )

        if existing:
            # Update existing
            for key, value in event.dict(exclude={'id'}).items():
                setattr(existing, key, value)
            return self.update(existing)
        else:
            # Create new
            return self.create(event)
