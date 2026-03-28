"""Authentication endpoints - login, refresh, logout"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header, Request
from sqlmodel import Session, select
from typing import Optional
from ...constants import UserRole

from ...database import get_session
from ...domain.entities.user import User
from ...domain.schemas.user_schema import UserCreate, UserLogin, EmailRequest, GoogleLoginRequest
from ...domain.schemas.responses import UserOut, TokenResponse
from ...core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    generate_csrf_token,
    create_email_verification_token,
    verify_email_verification_token,
    create_password_reset_token,
    verify_password_reset_token,
    generate_random_password,
    get_client_ip,
    validate_request_origin,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from ...core.email import email_service
from ...core.oauth import verify_google_token, generate_username_from_email
from ...core.dependencies import require_user
from ...config import get_settings
from ...domain.entities.login_history import LoginHistory

settings = get_settings()

router = APIRouter(prefix="/auth")

COOKIE_SAMESITE = "lax"
COOKIE_PATH_AUTH = "/"


def _record_login(session: Session, user_id: int, ip_address, user_agent, mac_address,
                  success: bool, method: str, failure_reason: str = None):
    session.add(LoginHistory(
        user_id=user_id, ip_address=ip_address, user_agent=user_agent,
        mac_address=mac_address, success=success, login_method=method,
        failure_reason=failure_reason,
    ))
    session.commit()


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str, csrf_token: str):
    secure = settings.cookie_secure
    response.set_cookie(
        key="access_token", value=access_token,
        httponly=True, secure=secure, samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token,
        httponly=True, secure=secure, samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, path=COOKIE_PATH_AUTH,
    )
    # httponly=False so JS can read it for the X-CSRF-Token header
    response.set_cookie(
        key="csrf_token", value=csrf_token,
        httponly=False, secure=secure, samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user. Sends email verification link — account must be verified before login."""
    if session.exec(select(User).where(User.username == user_data.username)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")

    if session.exec(select(User).where(User.email == user_data.email)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    db_user = User(
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=UserRole.USER,
        is_active=True,
        is_verified=False,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    plain_token, _, _ = create_email_verification_token(db_user.id, session)
    verification_link = f"{settings.frontend_url}/verify-email?token={plain_token}"
    email_service.send_verification_email(
        to_email=db_user.email, username=db_user.username, verification_link=verification_link
    )

    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    response: Response,
    request: Request,
    session: Session = Depends(get_session)
):
    """Login with username/email + password. Returns CSRF token; sets HttpOnly cookies."""
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")

    user = session.exec(
        select(User).where((User.username == credentials.username) | (User.email == credentials.username))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.password_hash):
        _record_login(session, user.id, ip_address, user_agent, mac_address, False, "local", "Invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        _record_login(session, user.id, ip_address, user_agent, mac_address, False, "local", "Account inactive")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    if not user.is_verified:
        _record_login(session, user.id, ip_address, user_agent, mac_address, False, "local", "Email not verified")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    _record_login(session, user.id, ip_address, user_agent, mac_address, True, "local")

    refresh_token_plain, _, _, session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    access_token, _ = create_access_token(user.id, user.role, session_id=session_id)
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token_plain, csrf_token)
    return TokenResponse(csrf_token=csrf_token, token_type="cookie", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    request: Request,
    refresh_token: Optional[str] = Cookie(None),
    csrf_token_cookie: Optional[str] = Cookie(None, alias="csrf_token"),
    csrf_token_header: Optional[str] = Header(None, alias="X-CSRF-Token"),
    origin: Optional[str] = Header(None),
    referer: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """Refresh access token (token rotation). Requires CSRF double-submit + valid origin."""
    if not csrf_token_cookie or not csrf_token_header or csrf_token_cookie != csrf_token_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token validation failed")

    if not validate_request_origin(origin, referer):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid request origin")

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")

    result = verify_refresh_token(refresh_token, session)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user_id, _ = result
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email verification was revoked.")

    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")

    new_refresh_plain, _, _, new_session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    new_access_token, _ = create_access_token(user.id, user.role, session_id=new_session_id)
    new_csrf_token = generate_csrf_token()

    _set_auth_cookies(response, new_access_token, new_refresh_plain, new_csrf_token)
    return TokenResponse(csrf_token=new_csrf_token, token_type="cookie", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    csrf_token_cookie: Optional[str] = Cookie(None, alias="csrf_token"),
    csrf_token_header: Optional[str] = Header(None, alias="X-CSRF-Token"),
    origin: Optional[str] = Header(None),
    referer: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """Logout — revokes refresh token and clears all auth cookies."""
    if csrf_token_cookie and csrf_token_header and csrf_token_cookie != csrf_token_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token validation failed")

    if not validate_request_origin(origin, referer):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid request origin")

    if refresh_token:
        revoke_refresh_token(refresh_token, session)

    secure = settings.cookie_secure
    response.delete_cookie(key="access_token", path="/", secure=secure, samesite=COOKIE_SAMESITE)
    response.delete_cookie(key="refresh_token", path=COOKIE_PATH_AUTH, secure=secure, samesite=COOKIE_SAMESITE)
    response.delete_cookie(key="csrf_token", path="/", secure=secure, samesite=COOKIE_SAMESITE)

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(require_user)):
    return user


@router.get("/verify-email/{token}")
async def verify_email(token: str, session: Session = Depends(get_session)):
    user_id = verify_email_verification_token(token, session)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        return {"message": "Email already verified. You can now log in."}

    user.is_verified = True
    session.add(user)
    session.commit()
    return {"message": "Email verified successfully! You can now log in."}


@router.post("/resend-verification")
async def resend_verification_email(request_data: EmailRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == request_data.email)).first()

    # Don't reveal whether email exists (prevent enumeration)
    if not user:
        return {"message": "If the email exists and is not verified, a verification email has been sent."}
    if user.is_verified:
        return {"message": "Email is already verified. You can log in."}

    plain_token, _, _ = create_email_verification_token(user.id, session)
    verification_link = f"{settings.frontend_url}/verify-email?token={plain_token}"

    email_sent = email_service.send_verification_email(
        to_email=user.email, username=user.username, verification_link=verification_link
    )
    if not email_sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to send verification email. Please try again later.")

    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/forgot-password")
async def forgot_password(request_data: EmailRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == request_data.email)).first()

    # Don't reveal whether email exists (prevent enumeration)
    if not user:
        return {"message": "If the email exists, a password reset link has been sent."}

    plain_token, _, _ = create_password_reset_token(user.id, session)
    reset_link = f"{settings.frontend_url}/reset-password?token={plain_token}"
    email_sent = email_service.send_password_reset_email(
        to_email=user.email, username=user.username, reset_link=reset_link
    )
    if not email_sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to send password reset email. Please try again later.")

    return {"message": "Password reset link sent. Please check your inbox."}


@router.get("/reset-password/{token}")
async def reset_password(token: str, session: Session = Depends(get_session)):
    user_id = verify_password_reset_token(token, session)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired password reset token")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_password = generate_random_password(12)
    user.password_hash = hash_password(new_password)
    session.add(user)
    session.commit()

    email_service.send_new_password_email(to_email=user.email, username=user.username, new_password=new_password)
    return {"message": "Password reset successful! Check your email for the new password."}


@router.post("/google", response_model=TokenResponse)
async def google_login(
    request_data: GoogleLoginRequest,
    response: Response,
    request: Request,
    session: Session = Depends(get_session)
):
    """Login/register via Google OAuth2. Creates account if user doesn't exist."""
    user_info = await verify_google_token(request_data.credential)
    if not user_info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")

    user = session.exec(select(User).where(User.email == user_info["email"])).first()

    if not user:
        username = generate_username_from_email(user_info["email"])
        counter = 1
        original_username = username
        while session.exec(select(User).where(User.username == username)).first():
            username = f"{original_username}{counter}"
            counter += 1

        user = User(
            username=username,
            first_name=user_info.get("given_name", ""),
            last_name=user_info.get("family_name", ""),
            email=user_info["email"],
            password_hash=hash_password(generate_random_password(16)),
            role=UserRole.USER,
            is_active=True,
            is_verified=True,  # Google accounts are pre-verified
            avatar_url=user_info.get("picture"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    _record_login(session, user.id, ip_address, user_agent, mac_address, True, "google")

    refresh_token_plain, _, _, session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    access_token, _ = create_access_token(user.id, user.role, session_id=session_id)
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token_plain, csrf_token)
    return TokenResponse(csrf_token=csrf_token, token_type="cookie", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
