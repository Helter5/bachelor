"""Maps source-specific Arena UUIDs to local weight category IDs"""
from typing import Optional
from uuid import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class WeightCategorySourceUid(SQLModel, table=True):
    __tablename__ = "weight_category_source_uids"
    __table_args__ = (
        UniqueConstraint("arena_source_id", "arena_uuid", name="uq_wc_source_uuid"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    weight_category_id: int = Field(foreign_key="weight_categories.id")
    arena_source_id: int = Field(foreign_key="arena_sources.id")
    arena_uuid: UUID = Field()
