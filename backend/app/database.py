from sqlmodel import create_engine, SQLModel, Session
from .config import settings

# Import all models to ensure they are registered with SQLModel
from .domain import (  # noqa: F401
    User,
    SportEvent,
    Team,
    Athlete,
    WeightCategory,
    Person,
    Fight,
)
from .domain.entities.discipline import Discipline  # noqa: F401
from .domain.entities.sync_log import SyncLog  # noqa: F401
from .domain.entities.arena_source import ArenaSource  # noqa: F401
from .domain.entities.login_history import LoginHistory  # noqa: F401
from .domain.entities.refresh_token import RefreshToken  # noqa: F401
from .domain.entities.password_reset_token import PasswordResetToken  # noqa: F401
from .domain.entities.email_verification_token import EmailVerificationToken  # noqa: F401
from .domain.entities.victory_type import VictoryType  # noqa: F401

engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
