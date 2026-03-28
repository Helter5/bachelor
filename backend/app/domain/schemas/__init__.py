"""Domain schemas - DTOs for API requests/responses"""
from .user_schema import UserCreate, UserPublic, UserLogin
from .sport_event_schema import SportEventCreate
from .team_schema import TeamCreate
from .athlete_schema import AthleteCreate
from .weight_category_schema import WeightCategoryCreate

__all__ = [
    "UserCreate",
    "UserPublic",
    "UserLogin",
    "SportEventCreate",
    "TeamCreate",
    "AthleteCreate",
    "WeightCategoryCreate",
]
