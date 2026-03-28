"""Login History entity - tracks user login attempts"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class LoginHistory(SQLModel, table=True):
    """
    Login History model - tracks successful and failed login attempts

    Used for security monitoring and user activity tracking
    """
    __tablename__ = "login_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    login_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = None
    mac_address: Optional[str] = Field(default=None, max_length=255)
    success: bool
    failure_reason: Optional[str] = Field(default=None, max_length=100)
    login_method: Optional[str] = Field(default="local", max_length=20)
