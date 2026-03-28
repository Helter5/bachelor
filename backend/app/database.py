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
)

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