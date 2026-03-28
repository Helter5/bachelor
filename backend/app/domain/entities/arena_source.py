"""Arena Source entity - stores multiple Arena instances to sync from"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class ArenaSourceBase(SQLModel):
    """Base ArenaSource fields shared across schemas"""
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

    Multiple Arena sources can be configured to sync from different
    trainer instances. Each source represents one Arena Docker instance.
    """
    __tablename__ = "arena_sources"

    id: Optional[int] = Field(default=None, primary_key=True)
    last_sync_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
