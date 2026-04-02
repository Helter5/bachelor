"""Sport Event entity - synced from Arena API"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class SportEventBase(SQLModel):
    """Base SportEvent fields shared across schemas"""
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

    Identified by natural key (name, start_date, country_iso_code).
    Multiple Arena instances may have different UUIDs for the same event —
    UUIDs are resolved at sync-time from the Arena source and never persisted.
    """
    __tablename__ = "sport_events"
    __table_args__ = (
        UniqueConstraint('name', 'start_date', 'country_iso_code',
                        name='uq_sport_event_natural_key'),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

