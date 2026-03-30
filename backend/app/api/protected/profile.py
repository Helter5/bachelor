"""Protected API - user profile management (requires authentication)"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import os
import uuid
from datetime import datetime, timezone

from ...database import get_session
from ...domain.entities.user import User
from ...domain.entities.refresh_token import RefreshToken
from ...domain.entities.login_history import LoginHistory
from ...domain.schemas.responses import UserOut
from ...core.dependencies import require_user, validate_csrf_and_origin
from ...core.security import hash_password, verify_password

router = APIRouter(prefix="/profile")


# ==================== Request Models ====================

class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    """Request model for changing password"""
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


# ==================== Response Models ====================

class ActiveSessionOut(BaseModel):
    """Active session information"""
    id: int
    created_at: datetime
    last_used_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    mac_address: Optional[str] = None
    is_current: bool  # True if this is the current session


class LoginHistoryOut(BaseModel):
    """Login history entry"""
    id: int
    login_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    mac_address: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    login_method: Optional[str] = "local"


# ==================== Profile Endpoints ====================

@router.get("/me", response_model=UserOut)
async def get_my_profile(
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Get current user's profile

    Requires: Authentication (any logged-in user)
    """
    return user


@router.put("/me", response_model=UserOut)
async def update_my_profile(
    profile_data: UpdateProfileRequest,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Update current user's profile (first_name, last_name, email)

    Requires: Authentication + CSRF token + Origin validation
    """
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email != user.email:
        statement = select(User).where(User.email == profile_data.email)
        existing_user = session.exec(statement).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account"
            )

    # Update fields
    if profile_data.first_name:
        user.first_name = profile_data.first_name
    if profile_data.last_name:
        user.last_name = profile_data.last_name
    if profile_data.email:
        user.email = profile_data.email

    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Change current user's password

    Requires: Authentication + CSRF token + Origin validation
    """
    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )

    # Update password
    user.password_hash = hash_password(password_data.new_password)
    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()

    # Revoke all other sessions for security
    statement = select(RefreshToken).where(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    )
    tokens = session.exec(statement).all()
    for token in tokens:
        token.is_revoked = True
        session.add(token)

    session.commit()

    return {"message": "Password changed successfully. All other sessions have been logged out."}


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Upload user avatar image

    Requires: Authentication + CSRF token + Origin validation
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPEG, PNG, GIF, WebP) are allowed"
        )

    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must not exceed 5MB"
        )

    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)

    # Derive extension from validated content_type — never trust filename
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}
    file_extension = ext_map[file.content_type]
    unique_filename = f"{user.id}_{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{unique_filename}"
    user.avatar_url = avatar_url
    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()

    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}


@router.delete("/avatar")
async def delete_avatar(
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Delete user avatar

    Requires: Authentication + CSRF token + Origin validation
    """
    if user.avatar_url:
        # Delete file from filesystem
        file_path = user.avatar_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

        # Clear avatar URL
        user.avatar_url = None
        user.updated_at = datetime.now(timezone.utc)

        session.add(user)
        session.commit()

    return {"message": "Avatar deleted successfully"}


# ==================== Security & Sessions ====================

@router.get("/sessions", response_model=List[ActiveSessionOut])
async def get_active_sessions(
    request: Request,
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Get all active sessions for current user

    Requires: Authentication
    """
    # Get current token from cookies
    current_token = request.cookies.get("refresh_token")

    statement = select(RefreshToken).where(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc)
    ).order_by(RefreshToken.created_at.desc())

    tokens = session.exec(statement).all()

    return [
        ActiveSessionOut(
            id=token.id,
            created_at=token.created_at,
            last_used_at=token.last_used_at,
            ip_address=token.ip_address,
            user_agent=token.user_agent,
            mac_address=token.mac_address,
            is_current=(token.token == current_token)
        )
        for token in tokens
    ]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Revoke specific session (logout from that device)

    Requires: Authentication + CSRF token + Origin validation
    """
    token = session.get(RefreshToken, session_id)

    if not token or token.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    token.is_revoked = True
    session.add(token)
    session.commit()

    return {"message": "Session revoked successfully"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Revoke all sessions except current one

    Requires: Authentication + CSRF token + Origin validation
    """
    statement = select(RefreshToken).where(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    )

    tokens = session.exec(statement).all()

    # Revoke all tokens
    for token in tokens:
        token.is_revoked = True
        session.add(token)

    session.commit()

    return {"message": f"All {len(tokens)} sessions have been revoked. Please log in again."}


@router.get("/login-history", response_model=List[LoginHistoryOut])
async def get_login_history(
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    """
    Get login history for current user

    Query parameters:
    - **skip**: Pagination offset
    - **limit**: Max records (default 50, max 100)

    Requires: Authentication
    """
    if limit > 100:
        limit = 100

    statement = select(LoginHistory).where(
        LoginHistory.user_id == user.id
    ).order_by(LoginHistory.login_at.desc()).offset(skip).limit(limit)

    history = session.exec(statement).all()

    return [
        LoginHistoryOut(
            id=entry.id,
            login_at=entry.login_at,
            ip_address=entry.ip_address,
            user_agent=entry.user_agent,
            mac_address=entry.mac_address,
            success=entry.success,
            failure_reason=entry.failure_reason,
            login_method=entry.login_method
        )
        for entry in history
    ]
