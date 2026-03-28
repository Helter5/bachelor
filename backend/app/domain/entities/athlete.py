"""Athlete entity - synced from Arena API"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class AthleteBase(SQLModel):
    """Base Athlete fields shared across schemas"""
    uid: UUID = Field(index=True)
    team_id: Optional[int] = None
    sport_event_id: Optional[int] = None
    weight_category_id: Optional[int] = None
    is_competing: Optional[bool] = None
    person_id: Optional[int] = None


class Athlete(AthleteBase, table=True):
    """Athlete model - synced from Arena API"""
    __tablename__ = "athletes"
    __table_args__ = (
        UniqueConstraint("sport_event_id", "person_id", "weight_category_id", name="uq_athlete_event_person_wc"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(index=True)
    person_id: Optional[int] = Field(default=None, foreign_key="persons.id")
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)
