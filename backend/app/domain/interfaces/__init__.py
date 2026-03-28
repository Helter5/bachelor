"""Domain interfaces - contracts for dependency inversion"""
from .repository_interfaces import (
    IBaseRepository,
    IAthleteRepository,
    ITeamRepository,
    ISportEventRepository,
    IWeightCategoryRepository,
)
from .arena_client_interface import IArenaClient

__all__ = [
    "IBaseRepository",
    "IAthleteRepository",
    "ITeamRepository",
    "ISportEventRepository",
    "IWeightCategoryRepository",
    "IArenaClient",
]
