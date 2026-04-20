"""Referee entity - officials for wrestling events"""
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import UniqueConstraint


class Referee(SQLModel, table=True):
    """Referee model - official for a wrestling event"""
    __tablename__ = "referees"
    __table_args__ = (
        UniqueConstraint("sport_event_id", "person_id", name="uq_referee_event_person"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    sport_event_id: int = Field(foreign_key="sport_events.id")
    person_id: Optional[int] = Field(default=None, foreign_key="persons.id")
    team_id: Optional[int] = Field(default=None, foreign_key="teams.id")

    number: Optional[int] = None
    referee_level: Optional[str] = Field(default=None, max_length=100)
    referee_group: Optional[str] = Field(default=None, max_length=10)
    delegate: bool = Field(default=False)
    matchairman: bool = Field(default=False)
    is_referee: bool = Field(default=False)
    preferred_style: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    mat_name: Optional[str] = Field(default=None, max_length=100)
    deactivated: bool = Field(default=False)

    sync_timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())
