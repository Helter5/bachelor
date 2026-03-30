"""Person entity - master identity for wrestlers across events"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class PersonBase(SQLModel):
    """Base Person fields shared across schemas"""
    full_name: str = Field(index=True)
    country_iso_code: Optional[str] = None


class Person(PersonBase, table=True):
    """Person model - master identity linking per-event athlete records"""
    __tablename__ = "persons"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
