"""Arena Source entity - stores multiple Arena instances to sync from"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class ArenaSourceBase(SQLModel):
    """Base ArenaSource fields shared across schemas"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    host: str = Field(default="host.docker.internal")
    port: int = Field(default=8080)
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    is_enabled: bool = Field(default=True)


class ArenaSource(ArenaSourceBase, table=True):
    """
    Arena Source model - stores Arena instance connection details

    Each user (coach/admin) configures their own local Arena instance.
    Sync operations use the requesting user's source, not a global one.
    """
    __tablename__ = "arena_sources"

    user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    last_sync_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
