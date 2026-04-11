"""RefreshToken entity for token persistence"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class RefreshToken(SQLModel, table=True):
    """Refresh token model for long-lived authentication and active sessions tracking"""
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True, max_length=255)
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime
    created_at: datetime
    is_revoked: bool = Field(default=False)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = None
    last_used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
