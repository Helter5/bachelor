"""PasswordResetToken entity for password recovery"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class PasswordResetToken(SQLModel, table=True):
    """Password reset token model for account recovery"""
    __tablename__ = "password_reset_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True, max_length=255)
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_used: bool = Field(default=False)
