"""Person entity - master identity for wrestlers across events"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class PersonBase(SQLModel):
    """Base Person fields shared across schemas"""
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(index=True)
    last_name: str = Field(index=True)
    country_iso_code: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Person(PersonBase, table=True):
    """Person model - master identity linking per-event athlete records"""
    __tablename__ = "persons"
    __table_args__ = (
        UniqueConstraint("first_name", "last_name", "country_iso_code", name="uq_person_identity"),
    )

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
