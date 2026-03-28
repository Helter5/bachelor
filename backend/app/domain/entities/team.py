"""Team entity - synced from Arena API"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class TeamBase(SQLModel):
    """Base Team fields shared across schemas"""
    uid: UUID = Field(index=True)
    sport_event_id: int
    name: str
    alternate_name: Optional[str] = None
    athlete_count: Optional[int] = None
    final_rank: Optional[int] = None
    country_iso_code: Optional[str] = None


class Team(TeamBase, table=True):
    """Team model - synced from Arena API"""
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint("sport_event_id", "name", name="uq_team_event_name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(index=True)
    sport_event_id: int = Field(foreign_key="sport_events.id")
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)

