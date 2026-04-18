"""Response schemas for public and protected API endpoints"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ==================== User/Auth Responses ====================

class UserOut(BaseModel):
    """Public user data (no password)"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: str
    last_name: str
    email: str
    role: str
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Auth response with CSRF token for cookie-based auth"""
    csrf_token: str  # CSRF token for X-CSRF-Token header
    token_type: str = "cookie"  # Indicates cookie-based auth
    expires_in: int  # Access token expiration in seconds


# ==================== Competition/Event Responses ====================

class SportEventOut(BaseModel):
    """Public competition/event data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    address_locality: Optional[str] = None
    country_iso_code: Optional[str] = None
    sync_timestamp: Optional[datetime] = None


class SportEventListOut(BaseModel):
    """Paginated list of events"""
    items: list[SportEventOut]
    total: int
    skip: int
    limit: int


# ==================== Team Responses ====================

class TeamOut(BaseModel):
    """Public team data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alternate_name: Optional[str] = None
    country_iso_code: Optional[str] = None
    sport_event_id: int
    athlete_count: Optional[int] = None
    sync_timestamp: Optional[datetime] = None


# ==================== Athlete Responses ====================

class AthleteMinimal(BaseModel):
    """Minimal athlete data for nested responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: Optional[int] = None


class AthleteOut(BaseModel):
    """Public athlete data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_full_name: Optional[str] = None
    sport_event_id: Optional[int] = None
    team_id: Optional[int] = None
    weight_category_id: Optional[int] = None
    is_competing: Optional[bool] = None
    person_id: Optional[int] = None
    sync_timestamp: Optional[datetime] = None


class AthleteWithDetails(BaseModel):
    """Athlete with related team and category info"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    sport_event_id: Optional[int] = None
    team_id: Optional[int] = None
    weight_category_id: Optional[int] = None
    team_name: Optional[str] = None
    weight_category_name: Optional[str] = None
    person_id: Optional[int] = None
    sync_timestamp: Optional[datetime] = None


# ==================== Weight Category Responses ====================

class WeightCategoryOut(BaseModel):
    """Public weight category data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    max_weight: Optional[int] = None
    count_fighters: Optional[int] = None
    is_started: Optional[bool] = None
    is_completed: Optional[bool] = None
    sport_event_id: Optional[int] = None
    discipline_id: Optional[int] = None
    # From disciplines (joined)
    sport_name: Optional[str] = None
    sport_id: Optional[str] = None
    audience_name: Optional[str] = None
    audience_id: Optional[str] = None
    rounds_number: Optional[int] = None
    round_duration: Optional[int] = None
    tournament_type: Optional[str] = None
    sync_timestamp: Optional[datetime] = None


# ==================== Person Responses ====================

class PersonOut(BaseModel):
    """Public person data (master wrestler identity)"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    full_name: str = ""
    country_iso_code: Optional[str] = None
    created_at: datetime
    fight_count: int = 0

    @model_validator(mode="after")
    def set_full_name(self) -> "PersonOut":
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}"
        return self


class PersonWithEventsOut(BaseModel):
    """Person with their event participations"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    full_name: str = ""
    country_iso_code: Optional[str] = None
    created_at: datetime
    events: list[dict] = []

    @model_validator(mode="after")
    def set_full_name(self) -> "PersonWithEventsOut":
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}"
        return self


# ==================== Admin Responses ====================

class SyncRunOut(BaseModel):
    """Sync run status (admin only)"""
    id: int
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    records_synced: int
    errors: list[str] = []


class ArenaSourceOut(BaseModel):
    """Arena source data (admin only)"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    host: str
    port: int
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    is_enabled: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime


class SyncLogOut(BaseModel):
    """Sync log data with user and arena source info"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    duration_seconds: Optional[int] = None
    events_created: int
    events_updated: int
    athletes_created: int
    athletes_updated: int
    teams_created: int
    teams_updated: int
    weight_categories_created: int
    weight_categories_updated: int
    fights_created: int
    fights_updated: int
    error_message: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None

    # Joined data
    username: Optional[str] = None
    arena_source_name: Optional[str] = None
