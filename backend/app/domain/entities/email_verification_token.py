"""EmailVerificationToken entity for email verification"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class EmailVerificationToken(SQLModel, table=True):
    """Email verification token model for account activation"""
    __tablename__ = "email_verification_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True, max_length=255)
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_used: bool = Field(default=False)
