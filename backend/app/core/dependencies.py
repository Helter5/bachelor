"""FastAPI dependencies for authentication and authorization"""
from fastapi import Depends, HTTPException, status, Cookie, Header, Request
from typing import Optional
from sqlmodel import Session, select
from ..constants import UserRole

from ..database import get_session
from ..domain.entities.user import User
from ..domain.entities.refresh_token import RefreshToken
from .security import decode_access_token, validate_request_origin


async def validate_csrf_and_origin(
    request: Request,
    csrf_token_cookie: Optional[str] = Cookie(None, alias="csrf_token"),
    csrf_token_header: Optional[str] = Header(None, alias="X-CSRF-Token"),
    origin: Optional[str] = Header(None),
    referer: Optional[str] = Header(None)
) -> None:
    """
    Validate unsafe requests with double-submit CSRF and Origin/Referer checks.
    """
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        if not csrf_token_cookie or not csrf_token_header or csrf_token_cookie != csrf_token_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed"
            )

        if not validate_request_origin(origin, referer):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid request origin"
            )


async def require_user(
    access_token: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
) -> User:
    """
    Resolve the current user and reject revoked JWT sessions.
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - access token not found"
        )

    payload = decode_access_token(access_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID"
        )

    try:
        statement = select(User).where(User.id == int(user_id))
        user = session.exec(statement).first()
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    sid = payload.get("sid")
    if sid is not None:
        token_record = session.get(RefreshToken, int(sid))
        if not token_record or token_record.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked"
            )

    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    
    return user
