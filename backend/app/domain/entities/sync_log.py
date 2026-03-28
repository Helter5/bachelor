"""Sync log entity for tracking synchronization operations"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON


class SyncLogBase(SQLModel):
    user_id: int = Field(foreign_key="users.id")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    status: str = Field(default="in_progress", max_length=20)
    duration_seconds: Optional[int] = None
    events_created: int = Field(default=0)
    events_updated: int = Field(default=0)
    athletes_created: int = Field(default=0)
    athletes_updated: int = Field(default=0)
    teams_created: int = Field(default=0)
    teams_updated: int = Field(default=0)
    weight_categories_created: int = Field(default=0)
    weight_categories_updated: int = Field(default=0)
    fights_created: int = Field(default=0)
    fights_updated: int = Field(default=0)
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)


class SyncLog(SyncLogBase, table=True):
    __tablename__ = "sync_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
