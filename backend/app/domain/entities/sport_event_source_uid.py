"""Maps source-specific Arena UUIDs to local sport event IDs"""
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class SportEventSourceUid(SQLModel, table=True):
    __tablename__ = "sport_event_source_uids"
    __table_args__ = (
        UniqueConstraint("arena_source_id", "source_uuid", name="uq_event_source_uuid"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    sport_event_id: int = Field(foreign_key="sport_events.id")
    arena_source_id: int = Field(foreign_key="arena_sources.id")
    source_uuid: UUID = Field()
