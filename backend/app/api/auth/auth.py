"""Authentication endpoints - login, refresh, logout"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header, Request
from sqlmodel import Session, select
from typing import Optional

from ...database import get_session
from ...domain.entities.user import User
from ...domain.schemas.user_schema import UserCreate, UserLogin
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
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ...core.email import email_service
from ...core.oauth import verify_google_token, generate_username_from_email
from ...config import get_settings

settings = get_settings()
from ...core.dependencies import require_user

router = APIRouter(prefix="/auth")


# Cookie settings
COOKIE_SECURE = True  # HTTPS only in production (set False for local dev)
COOKIE_SAMESITE = "lax"  # Lax for better compatibility, still protected
COOKIE_PATH_AUTH = "/"  # Available for all endpoints (needed for session validation)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """
    Register a new user and send email verification link

    - **username**: Unique username (3-50 characters)
    - **email**: Unique email address
    - **password**: Password (minimum 6 characters)

    After registration, a verification email will be sent to the provided email address.
    The account must be verified before logging in.
    """
    # Check existing username
    statement = select(User).where(User.username == user_data.username)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check existing email
    statement = select(User).where(User.email == user_data.email)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user (unverified by default)
    db_user = User(
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="user",  # Default role
        is_active=True,
        is_verified=False,  # Not verified yet
    )

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    # Create verification token
    plain_token, token_hash, expires_at = create_email_verification_token(db_user.id, session)

    # Build verification link
    verification_link = f"{settings.frontend_url}/verify-email?token={plain_token}"

    # Send verification email
    email_sent = email_service.send_verification_email(
        to_email=db_user.email,
        username=db_user.username,
        verification_link=verification_link
    )

    if not email_sent:
        # Log warning but don't fail registration
        # User can request a new verification email later
        import logging
        logging.warning(f"Failed to send verification email to {db_user.email}")

    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    response: Response,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Login and receive tokens in HttpOnly cookies (XSS protection)

    - **username**: Username or email
    - **password**: User password

    Sets TWO HttpOnly cookies:
    - access_token: Short-lived (15 min), used for API requests
    - refresh_token: Long-lived (30 days), used for token refresh
    - csrf_token: Double-submit cookie for CSRF protection

    Returns CSRF token in response body for client to include in headers
    """
    # Get IP address, user agent, and device ID
    from ...core.security import get_client_ip
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")  # Device fingerprint from frontend

    # Find user by username or email
    statement = select(User).where(
        (User.username == credentials.username) | (User.email == credentials.username)
    )
    user = session.exec(statement).first()

    # Track failed login attempt
    if not user:
        from ...domain.entities.login_history import LoginHistory
        # Create login history for failed attempt (user not found)
        login_entry = LoginHistory(
            user_id=-1,  # Invalid user ID for failed attempts without user
            ip_address=ip_address,
            user_agent=user_agent,
            mac_address=mac_address,
            success=False,
            failure_reason="User not found"
        )
        # Don't save this one since we don't have a user_id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.password_hash):
        from ...domain.entities.login_history import LoginHistory
        # Track failed login (wrong password)
        login_entry = LoginHistory(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            mac_address=mac_address,
            success=False,
            failure_reason="Invalid password",
            login_method="local"
        )
        session.add(login_entry)
        session.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        from ...domain.entities.login_history import LoginHistory
        # Track failed login (inactive account)
        login_entry = LoginHistory(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            mac_address=mac_address,
            success=False,
            failure_reason="Account inactive",
            login_method="local"
        )
        session.add(login_entry)
        session.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    if not user.is_verified:
        from ...domain.entities.login_history import LoginHistory
        # Track failed login (unverified account)
        login_entry = LoginHistory(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            mac_address=mac_address,
            success=False,
            failure_reason="Email not verified",
            login_method="local"
        )
        session.add(login_entry)
        session.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    # Track successful login
    from ...domain.entities.login_history import LoginHistory
    login_entry = LoginHistory(
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        mac_address=mac_address,
        success=True,
        login_method="local"
    )
    session.add(login_entry)
    session.commit()

    # Create tokens
    refresh_token_plain, refresh_token_hash, refresh_expires, session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    access_token, access_expires = create_access_token(user.id, user.role, session_id=session_id)

    # Generate CSRF token
    csrf_token = generate_csrf_token()
    
    # Set ACCESS token in HttpOnly cookie (XSS protection)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # JavaScript can't access (XSS protection)
        secure=COOKIE_SECURE,  # HTTPS only
        samesite=COOKIE_SAMESITE,  # CSRF protection
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",  # Available for all API endpoints
    )
    
    # Set REFRESH token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,  # 30 days
        path=COOKIE_PATH_AUTH,  # Only for /auth endpoints
    )
    
    # Set CSRF token (double-submit cookie pattern)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # JavaScript needs to read this
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
        path="/",
    )
    
    # Return CSRF token in response (client stores in memory/header)
    return TokenResponse(
        csrf_token=csrf_token,  # Frontend uses this in X-CSRF-Token header
        token_type="cookie",  # Indicate tokens are in cookies
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


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
    """
    Refresh access token using refresh token (token rotation)
    
    CSRF Protection: Requires matching CSRF tokens in cookie AND header
    Origin Check: Validates Origin/Referer headers
    Token Rotation: Each refresh generates NEW refresh token, old one revoked
    
    Returns new access token (15 min) in HttpOnly cookie
    """
    # CSRF validation (double-submit cookie pattern)
    if not csrf_token_cookie or not csrf_token_header or csrf_token_cookie != csrf_token_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed"
        )
    
    # Origin/Referer validation (defense-in-depth)
    from ...core.security import validate_request_origin
    if not validate_request_origin(origin, referer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid request origin"
        )
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # Verify and rotate refresh token
    result = verify_refresh_token(refresh_token, session)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id, old_token_id = result

    # Get user
    user = session.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Check if user is still verified (security check during token refresh)
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification was revoked. Please verify your email again."
        )

    # Get IP address, user agent, and device ID for the new token
    from ...core.security import get_client_ip
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")  # Device fingerprint from frontend

    # Create NEW access + refresh tokens (rotation)
    new_refresh_token_plain, new_refresh_token_hash, new_refresh_expires, new_session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    new_access_token, _ = create_access_token(user.id, user.role, session_id=new_session_id)
    
    # Generate new CSRF token
    new_csrf_token = generate_csrf_token()
    
    # Set NEW access token cookie
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    
    # Set NEW refresh token cookie (rotation)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_plain,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
        path=COOKIE_PATH_AUTH,
    )
    
    # Set NEW CSRF token
    response.set_cookie(
        key="csrf_token",
        value=new_csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
        path="/",
    )
    
    return TokenResponse(
        csrf_token=new_csrf_token,
        token_type="cookie",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


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
    """
    Logout user by revoking refresh token (CSRF protected)
    
    CSRF Protection: Validates double-submit cookie pattern
    Origin Check: Validates Origin/Referer headers
    
    Removes all auth cookies and marks refresh token as revoked in database
    """
    # CSRF validation
    if csrf_token_cookie and csrf_token_header and csrf_token_cookie != csrf_token_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed"
        )
    
    # Origin/Referer validation
    from ...core.security import validate_request_origin
    if not validate_request_origin(origin, referer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid request origin"
        )
    
    if refresh_token:
        revoke_refresh_token(refresh_token, session)
    
    # Delete all auth cookies (must match set_cookie parameters exactly)
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE
    )
    response.delete_cookie(
        key="refresh_token",
        path=COOKIE_PATH_AUTH,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE
    )
    response.delete_cookie(
        key="csrf_token",
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE
    )
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(require_user)):
    """
    Get current user profile

    Requires: Bearer token in Authorization header
    """
    return user


@router.get("/verify-email/{token}")
async def verify_email(token: str, session: Session = Depends(get_session)):
    """
    Verify user email address using verification token

    - **token**: Email verification token from the email link

    Returns success message if verification is successful
    """
    # Verify token and get user_id
    user_id = verify_email_verification_token(token, session)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Get user
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_verified:
        # Already verified, return success anyway
        return {"message": "Email already verified. You can now log in."}

    # Mark user as verified
    user.is_verified = True
    session.add(user)
    session.commit()

    return {"message": "Email verified successfully! You can now log in."}


@router.post("/resend-verification")
async def resend_verification_email(
    request_data: dict,
    session: Session = Depends(get_session)
):
    """
    Resend verification email to user

    Request body:
    - **email**: User's email address

    Sends a new verification email if the account exists and is not verified
    """
    email = request_data.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    # Find user by email
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if not user:
        # Don't reveal if email exists or not (security)
        return {"message": "If the email exists and is not verified, a verification email has been sent."}

    if user.is_verified:
        # Already verified
        return {"message": "Email is already verified. You can log in."}

    # Create new verification token
    plain_token, token_hash, expires_at = create_email_verification_token(user.id, session)

    # Build verification link
    verification_link = f"{settings.frontend_url}/verify-email?token={plain_token}"

    # Send verification email
    email_sent = email_service.send_verification_email(
        to_email=user.email,
        username=user.username,
        verification_link=verification_link
    )

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )

    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/forgot-password")
async def forgot_password(
    request_data: dict,
    session: Session = Depends(get_session)
):
    """
    Request password reset

    Request body:
    - **email**: User's email address

    Sends a password reset email with a link that expires in 1 hour
    """
    email = request_data.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    # Find user by email
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    # Don't reveal if email exists or not (security - prevent email enumeration)
    if not user:
        return {"message": "If the email exists, a password reset link has been sent."}

    # Create password reset token
    plain_token, token_hash, expires_at = create_password_reset_token(user.id, session)

    # Build reset link
    reset_link = f"{settings.frontend_url}/reset-password?token={plain_token}"

    # Send password reset email
    email_sent = email_service.send_password_reset_email(
        to_email=user.email,
        username=user.username,
        reset_link=reset_link
    )

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again later."
        )

    return {"message": "Password reset link sent. Please check your inbox."}


@router.get("/reset-password/{token}")
async def reset_password(token: str, session: Session = Depends(get_session)):
    """
    Reset password using token

    - **token**: Password reset token from the email link

    Generates a new random password and sends it via email
    """
    # Verify token and get user_id
    user_id = verify_password_reset_token(token, session)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )

    # Get user
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Generate new random password
    new_password = generate_random_password(12)

    # Hash and update password
    user.password_hash = hash_password(new_password)
    session.add(user)
    session.commit()

    # Send email with new password
    email_sent = email_service.send_new_password_email(
        to_email=user.email,
        username=user.username,
        new_password=new_password
    )

    if not email_sent:
        # Password was changed but email failed - log warning
        import logging
        logging.warning(f"Failed to send new password email to {user.email}")

    return {"message": "Password reset successful! Check your email for the new password."}


@router.post("/google", response_model=TokenResponse)
async def google_login(
    request_data: dict,
    response: Response,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Login with Google OAuth2

    Request body:
    - **credential**: Google ID token from frontend

    Creates account if user doesn't exist, or logs in existing user.
    Sets HttpOnly cookies with access/refresh tokens.
    """
    credential = request_data.get("credential")

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential is required"
        )

    # Verify Google token and get user info
    user_info = await verify_google_token(credential)

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    # Get IP address, user agent, and device ID
    from ...core.security import get_client_ip
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    mac_address = request.headers.get("X-Device-ID")

    # Find or create user
    statement = select(User).where(User.email == user_info["email"])
    user = session.exec(statement).first()

    if not user:
        # Create new user from Google account
        username = generate_username_from_email(user_info["email"])

        # Ensure username is unique
        counter = 1
        original_username = username
        while True:
            statement = select(User).where(User.username == username)
            if not session.exec(statement).first():
                break
            username = f"{original_username}{counter}"
            counter += 1

        user = User(
            username=username,
            first_name=user_info.get("given_name", ""),
            last_name=user_info.get("family_name", ""),
            email=user_info["email"],
            password_hash=hash_password(generate_random_password(16)),  # Random password (won't be used)
            role="user",
            is_active=True,
            is_verified=True,  # Google accounts are pre-verified
            avatar_url=user_info.get("picture"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Track successful login
    from ...domain.entities.login_history import LoginHistory
    login_entry = LoginHistory(
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        mac_address=mac_address,
        success=True,
        login_method="google"
    )
    session.add(login_entry)
    session.commit()

    # Create tokens
    refresh_token_plain, refresh_token_hash, refresh_expires, session_id = create_refresh_token(
        user.id, session, ip_address=ip_address, user_agent=user_agent, mac_address=mac_address
    )
    access_token, access_expires = create_access_token(user.id, user.role, session_id=session_id)

    # Generate CSRF token
    csrf_token = generate_csrf_token()

    # Set cookies (same as normal login)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
        path=COOKIE_PATH_AUTH,
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
        path="/",
    )

    return TokenResponse(
        csrf_token=csrf_token,
        token_type="cookie",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
