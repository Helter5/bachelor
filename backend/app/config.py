"""
Application Configuration
Centralized configuration for all environment variables and settings
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database Configuration
    database_user: str
    database_password: str
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str
    database_echo: bool = False

    # Arena API Configuration
    arena_api_format: str = "json"

    # JWT Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30
    jwt_issuer: str = "wrestling-federation-api"
    jwt_audience: str = "wrestling-federation-client"

    # Cookie / security settings
    cookie_secure: bool = True
    sync_log_max_entries: int = 10
    send_emails: bool = True

    # Email Configuration
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Wrestling Federation"
    frontend_url: str = "http://localhost:5173"
    # Comma-separated list of allowed CORS/CSRF origins, e.g. "http://localhost:5173,https://myapp.com"
    allowed_origins: str = ""

    # Google OAuth2 Configuration
    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def database_url(self) -> str:
        """Construct database URL from individual components"""
        return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"

    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False
        # Map environment variables to field names
        fields = {
            'database_user': {'env': 'DATABASE_USER'},
            'database_password': {'env': 'DATABASE_PASSWORD'},
            'database_host': {'env': 'DATABASE_HOST'},
            'database_port': {'env': 'DATABASE_PORT'},
            'database_name': {'env': 'DATABASE_NAME'},
            'database_echo': {'env': 'DATABASE_ECHO'},
            'arena_api_format': {'env': 'ARENA_API_FORMAT'},
            'jwt_secret_key': {'env': 'JWT_SECRET_KEY'},
            'jwt_algorithm': {'env': 'JWT_ALGORITHM'},
            'jwt_access_token_expire_minutes': {'env': 'JWT_ACCESS_TOKEN_EXPIRE_MINUTES'},
            'jwt_refresh_token_expire_days': {'env': 'JWT_REFRESH_TOKEN_EXPIRE_DAYS'},
            'jwt_issuer': {'env': 'JWT_ISSUER'},
            'jwt_audience': {'env': 'JWT_AUDIENCE'},
            'cookie_secure': {'env': 'COOKIE_SECURE'},
            'sync_log_max_entries': {'env': 'SYNC_LOG_MAX_ENTRIES'},
            'send_emails': {'env': 'SEND_EMAILS'},
            'allowed_origins': {'env': 'ALLOWED_ORIGINS'},
            'smtp_host': {'env': 'SMTP_HOST'},
            'smtp_port': {'env': 'SMTP_PORT'},
            'smtp_user': {'env': 'SMTP_USER'},
            'smtp_password': {'env': 'SMTP_PASSWORD'},
            'smtp_from_email': {'env': 'SMTP_FROM_EMAIL'},
            'smtp_from_name': {'env': 'SMTP_FROM_NAME'},
            'frontend_url': {'env': 'FRONTEND_URL'},
            'google_client_id': {'env': 'GOOGLE_CLIENT_ID'},
            'google_client_secret': {'env': 'GOOGLE_CLIENT_SECRET'},
        }


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance
    Uses lru_cache to ensure settings are only loaded once
    """
    return Settings()


# Convenience instance for direct import
settings = get_settings()
