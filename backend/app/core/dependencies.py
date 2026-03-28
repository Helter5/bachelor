"""FastAPI dependencies for authentication and authorization"""
from fastapi import Depends, HTTPException, status, Cookie, Header, Request
from typing import Optional
from sqlmodel import Session, select

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
    Validate CSRF token and request origin for unsafe methods

    Only validates for POST/PUT/PATCH/DELETE (not GET)
    Combines:
    - Double-submit CSRF cookie pattern
    - Origin/Referer validation (defense-in-depth)

    Raises: 403 if validation fails
    """
    # Only check for unsafe methods
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        # CSRF double-submit validation
        if not csrf_token_cookie or not csrf_token_header or csrf_token_cookie != csrf_token_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed"
            )

        # Origin/Referer validation (additional layer)
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
    Extract user from access_token HttpOnly cookie

    Checks:
    - Token exists
    - Token is valid (not expired, valid iss/aud)
    - User exists in database
    - User is active
    - Session is not revoked (sid check in JWT)

    Returns: User object
    Raises: 401 if authentication fails, 403 if account inactive
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - access token not found"
        )

    # Decode JWT (validates exp, iss, aud)
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

    # Check if the session has been revoked via session ID embedded in JWT
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
    """
    Dependency to require admin role
    
    Raises:
        HTTPException: 403 if user is not admin
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    
    return user
