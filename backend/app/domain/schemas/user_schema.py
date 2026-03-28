"""User schemas (DTOs) for API requests/responses"""
from datetime import datetime
from sqlmodel import SQLModel, Field
from pydantic import EmailStr
from ..entities.user import UserBase


class UserCreate(UserBase):
    """Schema for creating a new user"""
    username: str = Field(min_length=4, max_length=50)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=6)


class UserPublic(UserBase):
    """Public user data for API responses (no password)"""
    id: int
    created_at: datetime


class UserLogin(SQLModel):
    """Schema for user login - only username and password needed"""
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class EmailRequest(SQLModel):
    """Schema for requests that only need an email address"""
    email: EmailStr


class GoogleLoginRequest(SQLModel):
    """Schema for Google OAuth2 login"""
    credential: str
