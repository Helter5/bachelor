from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
