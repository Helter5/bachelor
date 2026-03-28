"""Authentication schemas (DTOs)"""
from sqlmodel import SQLModel


class Token(SQLModel):
    """JWT Token response"""
    access_token: str
    token_type: str


class TokenData(SQLModel):
    """Data stored in JWT token"""
    user_id: str
    email: str
