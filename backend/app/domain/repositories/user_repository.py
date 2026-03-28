"""User repository interface for database operations"""
from typing import Optional
from sqlmodel import Session, select
from ..entities.user import User


class UserRepository:
    """Repository for User entity database operations"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.session.get(User, user_id)
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        statement = select(User).where(User.username == username)
        return self.session.exec(statement).first()
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()
    
    def get_by_username_or_email(self, identifier: str) -> Optional[User]:
        """Get user by username or email"""
        statement = select(User).where(
            (User.username == identifier) | (User.email == identifier)
        )
        return self.session.exec(statement).first()
    
    def create(self, user: User) -> User:
        """Create new user"""
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
    
    def update(self, user: User) -> User:
        """Update existing user"""
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
    
    def delete(self, user: User) -> None:
        """Delete user"""
        self.session.delete(user)
        self.session.commit()
    
    def get_all_active(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Get all active users with pagination"""
        statement = select(User).where(User.is_active == True).offset(skip).limit(limit)
        return list(self.session.exec(statement).all())
