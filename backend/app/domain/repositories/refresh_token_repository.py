"""Refresh token repository interface for database operations"""
from typing import Optional
from datetime import datetime
from sqlmodel import Session, select
from ..entities.refresh_token import RefreshToken


class RefreshTokenRepository:
    """Repository for RefreshToken entity database operations"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_token_hash(self, token_hash: str) -> Optional[RefreshToken]:
        """Get refresh token by hash"""
        statement = select(RefreshToken).where(RefreshToken.token == token_hash)
        return self.session.exec(statement).first()
    
    def get_valid_token(self, token_hash: str) -> Optional[RefreshToken]:
        """Get valid (non-revoked, non-expired) refresh token"""
        statement = select(RefreshToken).where(
            RefreshToken.token == token_hash,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        )
        return self.session.exec(statement).first()
    
    def get_user_tokens(self, user_id: int, active_only: bool = True) -> list[RefreshToken]:
        """Get all refresh tokens for a user"""
        statement = select(RefreshToken).where(RefreshToken.user_id == user_id)
        
        if active_only:
            statement = statement.where(RefreshToken.is_revoked == False)
        
        return list(self.session.exec(statement).all())
    
    def create(self, refresh_token: RefreshToken) -> RefreshToken:
        """Create new refresh token"""
        self.session.add(refresh_token)
        self.session.commit()
        self.session.refresh(refresh_token)
        return refresh_token
    
    def revoke(self, refresh_token: RefreshToken) -> RefreshToken:
        """Mark refresh token as revoked"""
        refresh_token.is_revoked = True
        self.session.add(refresh_token)
        self.session.commit()
        self.session.refresh(refresh_token)
        return refresh_token
    
    def revoke_all_user_tokens(self, user_id: int) -> int:
        """Revoke all active refresh tokens for a user (breach response)"""
        tokens = self.get_user_tokens(user_id, active_only=True)
        
        for token in tokens:
            token.is_revoked = True
            self.session.add(token)
        
        self.session.commit()
        return len(tokens)
    
    def cleanup_expired(self) -> int:
        """Delete expired refresh tokens (cleanup job)"""
        statement = select(RefreshToken).where(
            RefreshToken.expires_at < datetime.utcnow()
        )
        expired_tokens = list(self.session.exec(statement).all())
        
        for token in expired_tokens:
            self.session.delete(token)
        
        self.session.commit()
        return len(expired_tokens)
