"""Security helpers for JWT tokens, CSRF tokens, and password hashing."""
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


def _trusted_proxy_ips() -> frozenset[str]:
    raw = settings.trusted_proxies
    return frozenset(ip.strip() for ip in raw.split(",") if ip.strip())


def get_client_ip(request: Request) -> Optional[str]:
    """Extract real client IP, trusting proxy headers only from configured trusted proxies."""
    connecting_ip = request.client.host if request.client else None
    if connecting_ip and connecting_ip in _trusted_proxy_ips():
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return connecting_ip


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
    """Generate an unpredictable CSRF token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """
    Hash a bearer token with HMAC-SHA256 and the server secret.

    The database stores only this keyed digest, so a leaked refresh-token
    record cannot be used directly as a bearer credential.
    """
    return hmac.new(
        settings.jwt_secret_key.encode(),
        token.encode(),
        hashlib.sha256
    ).hexdigest()


def compare_token_hash(hash1: str, hash2: str) -> bool:
    """Compare token hashes without data-dependent early exit."""
    return hmac.compare_digest(hash1, hash2)


def hash_password(password: str) -> str:
    """Hash a user password with bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(user_id: int, role: str, session_id: Optional[int] = None) -> tuple[str, datetime]:
    """
    Create a short-lived JWT access token.

    Returns:
        tuple[str, datetime]: (token, expiration_time)
    """
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = secrets.token_urlsafe(16)

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }

    if session_id is not None:
        payload["sid"] = session_id

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)
    return token, expires_at


def create_refresh_token(user_id: int, session: Session, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> tuple[str, str, datetime, int]:
    """
    Create a long-lived refresh token and store only its HMAC hash.

    Args:
        user_id: User ID
        session: Database session
        ip_address: IP address of the client
        user_agent: User agent string of the client

    Returns:
        tuple[str, str, datetime, int]: (plain_token, token_hash, expiration_time, session_id)
    """
    from ..domain.entities.refresh_token import RefreshToken

    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token = RefreshToken(
        token=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        is_revoked=False,
        ip_address=ip_address,
        user_agent=user_agent,
        last_used_at=datetime.now(timezone.utc),
    )
    session.add(refresh_token)
    session.commit()
    session.refresh(refresh_token)
    return plain_token, token_hash, expires_at, refresh_token.id


def verify_refresh_token(token: str, session: Session) -> Optional[tuple[int, int]]:
    """
    Verify a refresh token and rotate it by revoking the used record.

    Returns:
        Optional[tuple[int, int]]: (user_id, token_db_id) if valid, None otherwise
    """
    from ..domain.entities.refresh_token import RefreshToken
    
    token_hash = hash_token(token)
    
    statement = select(RefreshToken).where(
        RefreshToken.token == token_hash,
        RefreshToken.is_revoked.is_(False),
        RefreshToken.expires_at > datetime.now(timezone.utc)
    )
    
    refresh_token = session.exec(statement).first()
    
    if not refresh_token:
        used_statement = select(RefreshToken).where(
            RefreshToken.token == token_hash,
            RefreshToken.is_revoked.is_(True)
        )
        used_token = session.exec(used_statement).first()
        
        if used_token:
            # Reuse of a rotated token indicates token theft or replay.
            revoke_all_user_tokens(used_token.user_id, session)
        
        return None
    
    refresh_token.is_revoked = True
    session.add(refresh_token)
    session.commit()
    
    return refresh_token.user_id, refresh_token.id


def revoke_all_user_tokens(user_id: int, session: Session) -> None:
    """Revoke all active refresh tokens for one user."""
    from ..domain.entities.refresh_token import RefreshToken
    
    statement = select(RefreshToken).where(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked.is_(False)
    )
    
    tokens = session.exec(statement).all()
    
    for token in tokens:
        token.is_revoked = True
        session.add(token)
    
    session.commit()


def revoke_refresh_token(token: str, session: Session) -> bool:
    """
    Revoke a refresh token during logout.

    Returns True when the corresponding hashed token exists.
    """
    from ..domain.entities.refresh_token import RefreshToken
    
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
    """Decode and validate a JWT access token, including issuer and audience."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
        return payload
    except JWTError:
        return None


def _create_single_use_token(user_id: int, session: Session, entity_class, expire_hours: int) -> tuple[str, str, datetime]:
    old_tokens = session.exec(
        select(entity_class).where(entity_class.user_id == user_id, entity_class.is_used.is_(False))
    ).all()
    for t in old_tokens:
        t.is_used = True
        session.add(t)

    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expire_hours)

    token_obj = entity_class(
        token=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        is_used=False,
    )
    session.add(token_obj)
    session.commit()
    session.refresh(token_obj)
    return plain_token, token_hash, expires_at


def create_email_verification_token(user_id: int, session: Session) -> tuple[str, str, datetime]:
    """Create an email verification token; invalidates previous unused tokens for the user."""
    from ..domain.entities.email_verification_token import EmailVerificationToken
    return _create_single_use_token(user_id, session, EmailVerificationToken, 24)


def verify_email_verification_token(token: str, session: Session) -> Optional[int]:
    """Verify an email verification token and return the matching user ID."""
    from ..domain.entities.email_verification_token import EmailVerificationToken

    token_hash = hash_token(token)

    statement = select(EmailVerificationToken).where(
        EmailVerificationToken.token == token_hash,
        EmailVerificationToken.is_used.is_(False),
        EmailVerificationToken.expires_at > datetime.now(timezone.utc)
    )

    verification_token = session.exec(statement).first()

    if not verification_token:
        return None

    verification_token.is_used = True
    session.add(verification_token)
    session.commit()

    return verification_token.user_id


def generate_random_password(length: int = 12) -> str:
    """Generate a random password with letters, digits, and special characters."""
    import string

    characters = string.ascii_letters + string.digits + "!@#$%^&*"

    # Ensure every required character class is represented.
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]

    password += [secrets.choice(characters) for _ in range(length - 4)]

    secrets.SystemRandom().shuffle(password)

    return ''.join(password)


def create_password_reset_token(user_id: int, session: Session) -> tuple[str, str, datetime]:
    """Create a password reset token; invalidates previous unused tokens for the user."""
    from ..domain.entities.password_reset_token import PasswordResetToken
    return _create_single_use_token(user_id, session, PasswordResetToken, 1)


def verify_password_reset_token(token: str, session: Session, consume: bool = True) -> Optional[int]:
    """Verify a password reset token and return the matching user ID. If consume=True, marks token as used."""
    from ..domain.entities.password_reset_token import PasswordResetToken

    token_hash = hash_token(token)

    statement = select(PasswordResetToken).where(
        PasswordResetToken.token == token_hash,
        PasswordResetToken.is_used.is_(False),
        PasswordResetToken.expires_at > datetime.now(timezone.utc)
    )

    reset_token = session.exec(statement).first()

    if not reset_token:
        return None

    if consume:
        reset_token.is_used = True
        session.add(reset_token)
        session.commit()

    return reset_token.user_id
