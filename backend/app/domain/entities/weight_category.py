"""Weight Category entity - synced from Arena API"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class WeightCategoryBase(SQLModel):
    """Base WeightCategory fields shared across schemas"""
    id: Optional[int] = Field(default=None, primary_key=True)
    discipline_id: Optional[int] = None
    max_weight: Optional[int] = None
    count_fighters: Optional[int] = None
    is_started: Optional[bool] = None
    is_completed: Optional[bool] = None
    sport_event_id: Optional[int] = None


class WeightCategory(WeightCategoryBase, table=True):
    """Weight Category model - synced from Arena API"""
    __tablename__ = "weight_categories"
    __table_args__ = (
        UniqueConstraint("sport_event_id", "max_weight", "discipline_id", name="uq_wc_event_weight_discipline"),
    )

    discipline_id: Optional[int] = Field(default=None, foreign_key="disciplines.id")
    sport_event_id: Optional[int] = Field(default=None, foreign_key="sport_events.id")
    sync_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def name(self) -> Optional[str]:
        return f"{self.max_weight} kg" if self.max_weight is not None else None
