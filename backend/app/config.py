from functools import lru_cache
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Placeholder strings that ship in .env.example. The app refuses to start when
# the secret still contains any of these — guards against accidental deploy
# with the template value.
_JWT_SECRET_PLACEHOLDERS = ("change-this", "your-secret", "your-jwt-secret")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )

    database_user: str
    database_password: str
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str
    database_echo: bool = False
    app_debug: bool = False
    rate_limit_enabled: bool = True

    arena_api_format: str = "json"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30
    jwt_issuer: str = "wrestling-federation-api"
    jwt_audience: str = "wrestling-federation-client"

    cookie_secure: bool = True
    sync_log_max_entries: int = 10
    send_emails: bool = True

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Wrestling Federation"
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = ""
    # Comma-separated list of hostnames that TrustedHostMiddleware will accept
    # in the ``Host`` header. ``*`` disables the check (default for local dev).
    allowed_hosts: str = "*"
    # Comma-separated list of trusted reverse-proxy IPs. Only when the direct
    # connecting IP matches one of these will X-Forwarded-For / X-Real-IP be
    # trusted for client IP resolution. Empty = never trust proxy headers.
    trusted_proxies: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""

    @field_validator("jwt_secret_key")
    @classmethod
    def _jwt_secret_must_be_real(cls, value: str) -> str:
        """Reject placeholder secrets and anything shorter than 32 chars.

        The test environment is allowed to use a short, fixed secret via
        ``ALLOW_INSECURE_JWT_SECRET=1`` so pytest fixtures don't need a real
        random secret.
        """
        if os.environ.get("ALLOW_INSECURE_JWT_SECRET") == "1":
            return value
        if len(value) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters long. "
                "Generate one with: openssl rand -hex 32"
            )
        lowered = value.lower()
        if any(token in lowered for token in _JWT_SECRET_PLACEHOLDERS):
            raise ValueError(
                "JWT_SECRET_KEY still contains the .env.example placeholder. "
                "Replace it with a real secret before deploying."
            )
        return value

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
