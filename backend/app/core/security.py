"""Security utilities for JWT tokens and password hashing"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import hashlib
import hmac
from urllib.parse import urlparse
from jose import jwt, JWTError
import bcrypt
from fastapi import Request
from sqlmodel import Session, select
from ..config import get_settings

settings = get_settings()


def get_client_ip(request: Request) -> Optional[str]:
    """Extract real client IP from request, respecting proxy headers."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else None


ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.jwt_refresh_token_expire_days
JWT_ISSUER = settings.jwt_issuer
JWT_AUDIENCE = settings.jwt_audience


def _get_allowed_origins() -> list[str]:
    """Build allowed origins list from settings. Falls back to frontend_url."""
    if settings.allowed_origins:
        return [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    return [settings.frontend_url]


def validate_request_origin(origin: Optional[str], referer: Optional[str]) -> bool:
    """Validate Origin/Referer header against allowed origins (CSRF defense-in-depth)."""
    allowed = _get_allowed_origins()

    def _matches(url: str) -> bool:
        try:
            parsed = urlparse(url)
            return f"{parsed.scheme}://{parsed.netloc}" in allowed
        except Exception:
            return False

    if origin:
        return _matches(origin)
    if referer:
        return _matches(referer)
    return False


def generate_csrf_token() -> str:
    """Generate a secure CSRF token"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """
    Hash a token using proper HMAC-SHA256 with server secret
    
    HMAC is cryptographically secure for this use case:
    - Prevents rainbow table attacks (keyed hash)
    - Resistant to length extension attacks
    - Standard for token hashing (RFC 2104)
    """
    return hmac.new(
        settings.jwt_secret_key.encode(),
        token.encode(),
        hashlib.sha256
    ).hexdigest()


def compare_token_hash(hash1: str, hash2: str) -> bool:
    """
    Constant-time comparison of token hashes
    
    Prevents timing attacks that could leak information about valid tokens.
    """
    return hmac.compare_digest(hash1, hash2)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(user_id: int, role: str, session_id: int = None) -> tuple[str, datetime]:
    """
    Create a short-lived JWT access token with enhanced claims

    Returns:
        tuple[str, datetime]: (token, expiration_time)
    """
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = secrets.token_urlsafe(16)  # Unique token ID for tracking

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
        "jti": jti,  # JWT ID for token tracking/revocation
        "iss": JWT_ISSUER,  # Issuer
        "aud": JWT_AUDIENCE,  # Audience
    }

    if session_id is not None:
        payload["sid"] = session_id  # Session ID for revocation check

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)
    return token, expires_at


def create_refresh_token(user_id: int, session: Session, ip_address: Optional[str] = None, user_agent: Optional[str] = None, mac_address: Optional[str] = None) -> tuple[str, str, datetime, int]:
    """
    Create a long-lived refresh token and store HASHED version in database

    If a session with the same mac_address already exists for this user,
    it will be updated instead of creating a new one (prevents duplicate sessions).

    Args:
        user_id: User ID
        session: Database session
        ip_address: IP address of the client
        user_agent: User agent string of the client
        mac_address: Device fingerprint ID

    Returns:
        tuple[str, str, datetime, int]: (plain_token, token_hash, expiration_time, session_id)
    """
    from ..domain.entities.refresh_token import RefreshToken

    # Generate secure random token
    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_token(plain_token)  # Store hash, not plaintext!
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    # Check if there's an existing session with the same mac_address
    existing_session = None
    if mac_address:
        statement = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.mac_address == mac_address,
            RefreshToken.is_revoked == False
        )
        existing_session = session.exec(statement).first()

    if existing_session:
        # Update existing session instead of creating new one
        existing_session.token = token_hash
        existing_session.expires_at = expires_at
        existing_session.ip_address = ip_address
        existing_session.user_agent = user_agent
        existing_session.last_used_at = datetime.now(timezone.utc)
        session.add(existing_session)
        session.commit()
        return plain_token, token_hash, expires_at, existing_session.id
    else:
        # Store HASH in database (security best practice)
        refresh_token = RefreshToken(
            token=token_hash,  # HASH, not plaintext
            user_id=user_id,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
            is_revoked=False,
            ip_address=ip_address,
            user_agent=user_agent,
            mac_address=mac_address,
            last_used_at=datetime.now(timezone.utc),
        )
        session.add(refresh_token)
        session.commit()
        session.refresh(refresh_token)  # Get auto-generated ID
        return plain_token, token_hash, expires_at, refresh_token.id


def verify_refresh_token(token: str, session: Session) -> Optional[tuple[int, int]]:
    """
    Verify refresh token and return user_id if valid
    Implements refresh token rotation - marks token as used
    
    Returns:
        Optional[tuple[int, int]]: (user_id, token_db_id) if valid, None otherwise
    """
    from ..domain.entities.refresh_token import RefreshToken
    
    token_hash = hash_token(token)  # Hash incoming token for comparison
    
    statement = select(RefreshToken).where(
        RefreshToken.token == token_hash,
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc)
    )
    
    refresh_token = session.exec(statement).first()
    
    if not refresh_token:
        # Check if token was already used (reuse attack detection)
        used_statement = select(RefreshToken).where(
            RefreshToken.token == token_hash,
            RefreshToken.is_revoked == True
        )
        used_token = session.exec(used_statement).first()
        
        if used_token:
            # Token reuse detected! Security breach - revoke all user tokens
            revoke_all_user_tokens(used_token.user_id, session)
        
        return None
    
    # Mark token as used (rotation - one-time use only)
    refresh_token.is_revoked = True
    session.add(refresh_token)
    session.commit()
    
    return refresh_token.user_id, refresh_token.id


def revoke_all_user_tokens(user_id: int, session: Session) -> None:
    """
    Revoke all refresh tokens for a user (security breach response)
    
    Args:
        user_id: User ID whose tokens should be revoked
        session: Database session
    """
    from ..domain.entities.refresh_token import RefreshToken
    
    statement = select(RefreshToken).where(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked == False
    )
    
    tokens = session.exec(statement).all()
    
    for token in tokens:
        token.is_revoked = True
        session.add(token)
    
    session.commit()


def revoke_refresh_token(token: str, session: Session) -> bool:
    """
    Revoke a refresh token by hashing it and marking as revoked (logout)
    
    Args:
        token: Plain refresh token to revoke
        session: Database session
    
    Returns:
        bool: True if revoked, False if not found
    """
    from ..domain.entities.refresh_token import RefreshToken
    
    # Hash token for DB lookup
    token_hash = hash_token(token)
    
    statement = select(RefreshToken).where(RefreshToken.token == token_hash)
    refresh_token = session.exec(statement).first()
    
    if refresh_token:
        refresh_token.is_revoked = True
        session.add(refresh_token)
        session.commit()
        return True
    
    return False



def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate access token with issuer/audience check

    Validates:
    - Expiration (exp)
    - Issuer (iss)
    - Audience (aud)

    Returns:
        Optional[dict]: Payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,  # Validate audience
            issuer=JWT_ISSUER,  # Validate issuer
        )
        return payload
    except JWTError:
        return None


def create_email_verification_token(user_id: int, session: Session) -> tuple[str, str, datetime]:
    """
    Create an email verification token and store HASHED version in database

    Security: Invalidates all previous unused tokens for this user to ensure
    only the latest verification link works.

    Args:
        user_id: User ID
        session: Database session

    Returns:
        tuple[str, str, datetime]: (plain_token, token_hash, expiration_time)
    """
    from ..domain.entities.email_verification_token import EmailVerificationToken

    # Invalidate all previous unused tokens for this user (security best practice)
    statement = select(EmailVerificationToken).where(
        EmailVerificationToken.user_id == user_id,
        EmailVerificationToken.is_used == False
    )
    old_tokens = session.exec(statement).all()
    for old_token in old_tokens:
        old_token.is_used = True
        session.add(old_token)

    # Generate secure random token
    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)  # 24 hour expiry

    # Store HASH in database
    verification_token = EmailVerificationToken(
        token=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        is_used=False,
    )
    session.add(verification_token)
    session.commit()
    session.refresh(verification_token)

    return plain_token, token_hash, expires_at


def verify_email_verification_token(token: str, session: Session) -> Optional[int]:
    """
    Verify email verification token and return user_id if valid

    Args:
        token: Plain verification token
        session: Database session

    Returns:
        Optional[int]: user_id if valid, None otherwise
    """
    from ..domain.entities.email_verification_token import EmailVerificationToken

    token_hash = hash_token(token)

    statement = select(EmailVerificationToken).where(
        EmailVerificationToken.token == token_hash,
        EmailVerificationToken.is_used == False,
        EmailVerificationToken.expires_at > datetime.now(timezone.utc)
    )

    verification_token = session.exec(statement).first()

    if not verification_token:
        return None

    # Mark token as used
    verification_token.is_used = True
    session.add(verification_token)
    session.commit()

    return verification_token.user_id


def generate_random_password(length: int = 12) -> str:
    """
    Generate a secure random password

    Args:
        length: Password length (default 12)

    Returns:
        str: Random password with mix of letters, digits, and special chars
    """
    import string

    # Mix of uppercase, lowercase, digits, and special characters
    characters = string.ascii_letters + string.digits + "!@#$%^&*"

    # Ensure at least one of each type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]

    # Fill the rest randomly
    password += [secrets.choice(characters) for _ in range(length - 4)]

    # Shuffle to avoid predictable pattern
    secrets.SystemRandom().shuffle(password)

    return ''.join(password)


def create_password_reset_token(user_id: int, session: Session) -> tuple[str, str, datetime]:
    """
    Create a password reset token and store HASHED version in database

    Security: Invalidates all previous unused tokens for this user.

    Args:
        user_id: User ID
        session: Database session

    Returns:
        tuple[str, str, datetime]: (plain_token, token_hash, expiration_time)
    """
    from ..domain.entities.password_reset_token import PasswordResetToken

    # Invalidate all previous unused tokens for this user
    statement = select(PasswordResetToken).where(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.is_used == False
    )
    old_tokens = session.exec(statement).all()
    for old_token in old_tokens:
        old_token.is_used = True
        session.add(old_token)

    # Generate secure random token
    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiry

    # Store HASH in database
    reset_token = PasswordResetToken(
        token=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        is_used=False,
    )
    session.add(reset_token)
    session.commit()
    session.refresh(reset_token)

    return plain_token, token_hash, expires_at


def verify_password_reset_token(token: str, session: Session) -> Optional[int]:
    """
    Verify password reset token and return user_id if valid

    Args:
        token: Plain reset token
        session: Database session

    Returns:
        Optional[int]: user_id if valid, None otherwise
    """
    from ..domain.entities.password_reset_token import PasswordResetToken

    token_hash = hash_token(token)

    statement = select(PasswordResetToken).where(
        PasswordResetToken.token == token_hash,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc)
    )

    reset_token = session.exec(statement).first()

    if not reset_token:
        return None

    # Mark token as used
    reset_token.is_used = True
    session.add(reset_token)
    session.commit()

    return reset_token.user_id
