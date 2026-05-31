"""Protected API - user profile management (requires authentication)"""
from fastapi import APIRouter, Cookie, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import asyncio
import os
import uuid
from datetime import datetime, timezone

from ...database import get_session
from ...domain.entities.user import User
from ...domain.entities.login_history import LoginHistory
from ...domain.schemas.responses import UserOut
from ...core.dependencies import require_user, validate_csrf_and_origin
from ...core.paths import AVATARS_DIR
from ...core.security import hash_password, verify_password
from ...services.session_service import SessionService

router = APIRouter(prefix="/profile")


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class ActiveSessionOut(BaseModel):
    id: int
    created_at: datetime
    last_used_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_current: bool


class LoginHistoryOut(BaseModel):
    id: int
    login_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    login_method: Optional[str] = "local"


@router.get("/me", response_model=UserOut)
async def get_my_profile(user: User = Depends(require_user)):
    return user


@router.put("/me", response_model=UserOut)
async def update_my_profile(
    profile_data: UpdateProfileRequest,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    if profile_data.email and profile_data.email != user.email:
        statement = select(User).where(User.email == profile_data.email)
        existing_user = session.exec(statement).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account"
            )

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
    session: Session = Depends(get_session),
    refresh_token: Optional[str] = Cookie(None)
):
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    user.password_hash = hash_password(password_data.new_password)
    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()

    SessionService(session).revoke_other_sessions(user.id, refresh_token)

    return {"message": "Password changed successfully. All other sessions have been logged out."}


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "avatar_invalid_type",
                "message": "Only image files (JPEG, PNG, GIF, WebP) are allowed.",
            },
        )

    _MAX_AVATAR_BYTES = 5 * 1024 * 1024
    contents = await file.read(_MAX_AVATAR_BYTES + 1)
    if len(contents) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "avatar_too_large",
                "message": "Avatar file size must not exceed 5 MB.",
            },
        )

    if user.avatar_url:
        old_path = os.path.join(AVATARS_DIR, os.path.basename(user.avatar_url))
        if os.path.exists(old_path):
            await asyncio.to_thread(os.remove, old_path)

    upload_dir = AVATARS_DIR
    await asyncio.to_thread(os.makedirs, upload_dir, exist_ok=True)

    # Derive extension from validated content_type — never trust filename
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}
    file_extension = ext_map[file.content_type]
    unique_filename = f"{user.id}_{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    def _write(path: str, data: bytes) -> None:
        with open(path, "wb") as f:
            f.write(data)

    await asyncio.to_thread(_write, file_path, contents)

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
    if user.avatar_url:
        file_path = os.path.join(AVATARS_DIR, os.path.basename(user.avatar_url))
        if os.path.exists(file_path):
            await asyncio.to_thread(os.remove, file_path)

        user.avatar_url = None
        user.updated_at = datetime.now(timezone.utc)

        session.add(user)
        session.commit()

    return {"message": "Avatar deleted successfully"}



@router.get("/sessions", response_model=List[ActiveSessionOut])
async def get_active_sessions(
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
    refresh_token: Optional[str] = Cookie(None)
):
    active_sessions = SessionService(session).list_active_sessions(user.id, refresh_token)

    return [
        ActiveSessionOut(
            id=active_session.token.id,
            created_at=active_session.token.created_at,
            last_used_at=active_session.token.last_used_at,
            ip_address=active_session.token.ip_address,
            user_agent=active_session.token.user_agent,
            is_current=active_session.is_current
        )
        for active_session in active_sessions
    ]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
    revoked = SessionService(session).revoke_session(user.id, session_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {"message": "Session revoked successfully"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
    refresh_token: Optional[str] = Cookie(None)
):
    revoked_count = SessionService(session).revoke_other_sessions(user.id, refresh_token)

    return {"message": f"{revoked_count} other sessions have been revoked."}


@router.get("/login-history", response_model=List[LoginHistoryOut])
async def get_login_history(
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(require_user),
    session: Session = Depends(get_session)
):
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
            success=entry.success,
            failure_reason=entry.failure_reason,
            login_method=entry.login_method
        )
        for entry in history
    ]
