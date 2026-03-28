"""Sport Event entity - synced from Arena API"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class SportEventBase(SQLModel):
    """Base SportEvent fields shared across schemas"""
    arena_uuid: UUID = Field(index=True)  # UUID from Arena API (not unique across instances)
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    country_iso_code: Optional[str] = None
    address_locality: Optional[str] = None
    is_individual_event: Optional[bool] = None
    is_team_event: Optional[bool] = None
    is_beach_wrestling: Optional[bool] = None
    tournament_type: Optional[str] = None
    event_type: Optional[str] = None
    continent: Optional[str] = None
    timezone: Optional[str] = None
    visible: Optional[bool] = None
    is_sync_enabled: Optional[bool] = None


class SportEvent(SportEventBase, table=True):
    """
    Sport Event model - synced from Arena API

    Natural key matching: Events are identified by (name, start_date, country_iso_code)
    to handle distributed Arena instances with different UUIDs for the same event.

    arena_uuid: Stores the Arena API UUID for reference, but NOT used as primary matcher
                since different Arena instances generate different UUIDs for same event.
    """
    __tablename__ = "sport_events"
    __table_args__ = (
        UniqueConstraint('name', 'start_date', 'country_iso_code',
                        name='uq_sport_event_natural_key'),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    arena_uuid: UUID = Field(index=True)  # Not unique - multiple Arena instances
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

