"""User entity and related models"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from pydantic import EmailStr


class UserBase(SQLModel):
    """Base user fields shared across schemas"""
    username: str = Field(max_length=50, index=True)
    first_name: str = Field(max_length=50)
    last_name: str = Field(max_length=50)
    email: EmailStr = Field(index=True)


class User(UserBase, table=True):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(default_factory=uuid4, unique=True)
    username: str = Field(max_length=50, unique=True, index=True)
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str = Field(max_length=255)
    role: str = Field(default="user", max_length=20)  # "admin" or "user"
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

