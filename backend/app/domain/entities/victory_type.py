"""VictoryType entity - reference table for fight outcome types"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class VictoryType(SQLModel, table=True):
    """VictoryType - reference table synced from Arena API config/victory-types"""
    __tablename__ = "victory_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=10)
    type: Optional[str] = Field(default=None, max_length=100)
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)
