"""Discipline entity - sport + audience combination with tournament rules"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class Discipline(SQLModel, table=True):
    """Discipline - master data for sport/audience combos (e.g. Men's Freestyle Seniors)"""
    __tablename__ = "disciplines"
    __table_args__ = (
        UniqueConstraint("sport_id", "audience_id", name="uq_disciplines_sport_audience"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    sport_id: str = Field(max_length=20)
    sport_name: Optional[str] = Field(default=None, max_length=50)
    audience_id: Optional[str] = Field(default=None, max_length=20)
    audience_name: Optional[str] = Field(default=None, max_length=50)
    rounds_number: Optional[int] = None
    round_duration: Optional[int] = None
    tournament_type: Optional[str] = Field(default=None, max_length=50)
    sync_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
