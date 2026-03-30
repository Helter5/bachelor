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
from .domain.entities.sport_event_source_uid import SportEventSourceUid  # noqa: F401
from .domain.entities.athlete_source_uid import AthleteSourceUid  # noqa: F401
from .domain.entities.weight_category_source_uid import WeightCategorySourceUid  # noqa: F401

# Create engine with centralized configuration
engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,  # Connection pool size
    max_overflow=10,  # Maximum overflow connections
)


def create_db_and_tables():
    """Create all tables in the database"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency for getting database sessions"""
    with Session(engine) as session:
        yield session