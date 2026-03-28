from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from pydantic import EmailStr


# User Models
class User(SQLModel, table=True):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(default_factory=uuid4, unique=True)
    username: str = Field(max_length=50, unique=True, index=True)
    first_name: str = Field(max_length=50)
    last_name: str = Field(max_length=50)
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str = Field(max_length=255)
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(SQLModel):
    """Schema for creating a new user"""
    username: str = Field(min_length=4, max_length=50)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)


class UserPublic(SQLModel):
    """Public user data for API responses (no password)"""
    id: int
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    created_at: datetime


class UserLogin(SQLModel):
    """Schema for user login"""
    username: str
    password: str


class Token(SQLModel):
    """JWT Token response"""
    access_token: str
    token_type: str


class TokenData(SQLModel):
    """Data stored in JWT token"""
    user_id: str
    email: str



class SportEvent(SQLModel, table=True):
    """Sport Event model - synced from Arena API"""
    __tablename__ = "sport_events"

    id: Optional[int] = Field(default=None, primary_key=True)  # Auto-incrementing integer ID
    uuid: str = Field(unique=True, index=True)  # UUID from Arena API
    name: str
    full_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    country_iso_code: Optional[str] = None
    address_locality: Optional[str] = None
    is_individual_event: Optional[bool] = None
    is_team_event: Optional[bool] = None
    is_beach_wrestling: Optional[bool] = None
    tournament_type: Optional[str] = None
    event_type: Optional[str] = None
    continent: Optional[str] = None
    timezone: Optional[str] = None
    visible: Optional[bool] = None
    is_sync_enabled: Optional[bool] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SportEventCreate(SQLModel):
    """Schema for creating/updating sport event"""
    uuid: str  # UUID from Arena API (not id)
    name: str
    full_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    country_iso_code: Optional[str] = None
    address_locality: Optional[str] = None
    is_individual_event: Optional[bool] = None
    is_team_event: Optional[bool] = None
    is_beach_wrestling: Optional[bool] = None
    tournament_type: Optional[str] = None
    event_type: Optional[str] = None
    continent: Optional[str] = None
    timezone: Optional[str] = None
    visible: Optional[bool] = None
    is_sync_enabled: Optional[bool] = None


class Team(SQLModel, table=True):
    """Team model - synced from Arena API"""
    __tablename__ = "teams"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(unique=True, index=True)
    sport_event_id: int = Field(foreign_key="sport_events.id")
    name: str
    alternate_name: Optional[str] = None
    athlete_count: Optional[int] = None
    final_rank: Optional[int] = None
    country_iso_code: Optional[str] = None
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)


class TeamCreate(SQLModel):
    """Schema for creating/updating team"""
    uid: UUID  # UUID from Arena API
    sport_event_id: int
    name: str
    alternate_name: Optional[str] = None
    athlete_count: Optional[int] = None
    final_rank: Optional[int] = None
    country_iso_code: Optional[str] = None


class WeightCategory(SQLModel, table=True):
    """Weight Category model - synced from Arena API"""
    __tablename__ = "weight_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(unique=True, index=True)
    name: Optional[str] = None
    sport_name: Optional[str] = None
    sport_id: Optional[str] = None
    audience_name: Optional[str] = None
    audience_id: Optional[str] = None
    max_weight: Optional[int] = None
    rounds_number: Optional[int] = None
    round_duration: Optional[int] = None
    overtime: Optional[int] = None
    tournament_type: Optional[str] = None
    uww_ranking: Optional[bool] = None
    count_fighters: Optional[int] = None
    is_started: Optional[bool] = None
    is_completed: Optional[bool] = None
    is_uww_ranking_enabled: Optional[bool] = None
    sport_event_id: Optional[int] = None  # Integer FK to sport_events.id
    fighters_updated: Optional[datetime] = None
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)


class WeightCategoryCreate(SQLModel):
    """Schema for creating/updating weight category"""
    uid: UUID  # UUID from Arena API
    name: Optional[str] = None
    sport_name: Optional[str] = None
    sport_id: Optional[str] = None
    audience_name: Optional[str] = None
    audience_id: Optional[str] = None
    max_weight: Optional[int] = None
    rounds_number: Optional[int] = None
    round_duration: Optional[int] = None
    overtime: Optional[int] = None
    tournament_type: Optional[str] = None
    uww_ranking: Optional[bool] = None
    count_fighters: Optional[int] = None
    is_started: Optional[bool] = None
    is_completed: Optional[bool] = None
    is_uww_ranking_enabled: Optional[bool] = None
    sport_event_id: Optional[int] = None  # Integer FK to sport_events.id
    fighters_updated: Optional[datetime] = None


class Athlete(SQLModel, table=True):
    """Athlete model - synced from Arena API"""
    __tablename__ = "athletes"

    id: Optional[int] = Field(default=None, primary_key=True)
    uid: UUID = Field(unique=True, index=True)
    team_id: Optional[int] = None  # Integer FK to teams.id
    sport_event_id: Optional[int] = None  # Integer FK to sport_events.id
    weight_category_id: Optional[int] = None  # Integer FK to weight_categories.id
    is_competing: Optional[bool] = None
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)


class AthleteCreate(SQLModel):
    """Schema for creating/updating athlete"""
    uid: UUID  # UUID from Arena API
    team_id: Optional[int] = None  # Integer FK to teams.id
    sport_event_id: Optional[int] = None  # Integer FK to sport_events.id
    weight_category_id: Optional[int] = None  # Integer FK to weight_categories.id
    is_competing: Optional[bool] = None


class Fight(SQLModel, table=True):
    """Individual fight/match"""
    __tablename__ = "fights"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    fighter_id: int = Field(foreign_key="fighters.id")
    opponent_name: str  # Can be extended to another Fighter relationship

    result: Optional[str] = None  # WIN, LOSS, DRAW, NC
    method: Optional[str] = None  # KO, TKO, SUB, DEC, etc.
    round: Optional[int] = None
    time: Optional[str] = None  # Time in round (e.g., "4:35")

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    event: Event = Relationship(back_populates="fights")
    fighter: Fighter = Relationship(back_populates="fights")


# API Response Models (without table=True)
class FighterPublic(SQLModel):
    """Public fighter data for API responses"""
    id: int
    first_name: str
    last_name: str
    nickname: Optional[str] = None
    nationality: Optional[str] = None
    wins: int
    losses: int
    draws: int


class SportPublic(SQLModel):
    """Public sport data for API responses"""
    id: int
    name: str
    description: Optional[str] = None


class EventPublic(SQLModel):
    """Public event data for API responses"""
    id: int
    name: str
    date: datetime
    location: Optional[str] = None
    venue: Optional[str] = None
