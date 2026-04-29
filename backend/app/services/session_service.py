"""Session listing and revocation logic for user account security."""
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlmodel import Session, select

from ..core.security import compare_token_hash, hash_token
from ..domain.entities.refresh_token import RefreshToken


@dataclass(frozen=True)
class ActiveSession:
    token: RefreshToken
    is_current: bool


class SessionService:
    """Manage persisted refresh-token sessions for a user."""

    def __init__(self, session: Session):
        self.session = session

    def list_active_sessions(self, user_id: int, current_refresh_token: str | None) -> list[ActiveSession]:
        current_hash = self._hash_current_token(current_refresh_token)
        tokens = self.session.exec(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .order_by(RefreshToken.created_at.desc())
        ).all()

        return [
            ActiveSession(
                token=token,
                is_current=bool(current_hash and compare_token_hash(token.token, current_hash)),
            )
            for token in tokens
        ]

    def revoke_session(self, user_id: int, session_id: int) -> bool:
        token = self.session.get(RefreshToken, session_id)
        if not token or token.user_id != user_id:
            return False

        token.is_revoked = True
        self.session.add(token)
        self.session.commit()
        return True

    def revoke_other_sessions(self, user_id: int, current_refresh_token: str | None) -> int:
        current_hash = self._hash_current_token(current_refresh_token)
        statement = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        if current_hash:
            statement = statement.where(RefreshToken.token != current_hash)

        tokens = self.session.exec(statement).all()
        for token in tokens:
            token.is_revoked = True
            self.session.add(token)

        self.session.commit()
        return len(tokens)

    @staticmethod
    def _hash_current_token(current_refresh_token: str | None) -> str | None:
        return hash_token(current_refresh_token) if current_refresh_token else None
