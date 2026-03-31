"""Fight entity - synced from Arena API"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel


class FightBase(SQLModel):
    """Base Fight fields shared across schemas"""
    uid: UUID = Field(index=True)
    sport_event_id: int
    weight_category_id: Optional[int] = None
    fighter_one_id: Optional[int] = None
    fighter_two_id: Optional[int] = None
    winner_id: Optional[int] = None
    tp_one: Optional[int] = None
    tp_two: Optional[int] = None
    cp_one: Optional[int] = None
    cp_two: Optional[int] = None
    victory_type: Optional[str] = Field(default=None, foreign_key="victory_types.code")
    duration: Optional[int] = None
    round_name: Optional[str] = Field(default=None, max_length=100)
    fight_number: Optional[int] = None


class Fight(FightBase, table=True):
    """Fight model - synced from Arena API"""
    __tablename__ = "fights"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(index=True)
    sport_event_id: int = Field(foreign_key="sport_events.id")
    weight_category_id: Optional[int] = Field(default=None, foreign_key="weight_categories.id")
    fighter_one_id: Optional[int] = Field(default=None, foreign_key="athletes.id")
    fighter_two_id: Optional[int] = Field(default=None, foreign_key="athletes.id")
    winner_id: Optional[int] = Field(default=None, foreign_key="athletes.id")
    sync_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
