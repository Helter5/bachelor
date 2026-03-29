"""Maps source-specific Arena UUIDs to local athlete IDs"""
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class AthleteSourceUid(SQLModel, table=True):
    __tablename__ = "athlete_source_uids"
    __table_args__ = (
        UniqueConstraint("arena_source_id", "arena_uuid", name="uq_athlete_source_uuid"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athletes.id")
    arena_source_id: int = Field(foreign_key="arena_sources.id")
    arena_uuid: UUID = Field()
