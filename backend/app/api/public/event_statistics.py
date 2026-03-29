"""Public API - event statistics (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from collections import Counter

from ...database import get_session
from ...domain.entities.fight import Fight
from ...domain.entities.athlete import Athlete
from ...domain.entities.sport_event import SportEvent
from ...domain.entities.team import Team
from ...domain.entities.person import Person
router = APIRouter(prefix="/events")


@router.get("/{event_id}/statistics")
async def get_event_statistics(
    event_id: int,
    session: Session = Depends(get_session),
):
    """
    Get aggregated statistics for a sport event.
    Includes victory type distribution, averages, top performers, and team performance.
    """
    event = session.get(SportEvent, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Get all fights for this event
    fights = session.exec(
        select(Fight).where(Fight.sport_event_id == event_id)
    ).all()

    total_fights = len(fights)

    if total_fights == 0:
        return {
            "event_id": event_id,
            "event_name": event.name,
            "total_fights": 0,
            "victory_type_distribution": {},
            "avg_duration": 0,
            "avg_tp": 0.0,
            "avg_cp": 0.0,
            "top_performers": [],
            "team_performance": [],
        }

    # Victory type distribution
    victory_types = Counter()
    total_duration = 0
    duration_count = 0
    total_tp = 0
    tp_count = 0
    total_cp = 0
    cp_count = 0

    # Per-athlete stats: athlete_id -> {wins, total, name, team_id}
    athlete_stats: dict[int, dict] = {}

    for fight in fights:
        # Victory type
        if fight.victory_type:
            victory_types[fight.victory_type] += 1

        # Duration
        if fight.duration and fight.duration > 0:
            total_duration += fight.duration
            duration_count += 1

        # TP
        for tp in [fight.tp_one, fight.tp_two]:
            if tp is not None:
                total_tp += tp
                tp_count += 1

        # CP
        for cp in [fight.cp_one, fight.cp_two]:
            if cp is not None:
                total_cp += cp
                cp_count += 1

        # Track fighter participation (set avoids double-counting when same athlete on both sides)
        for fighter_id in set(filter(None, [fight.fighter_one_id, fight.fighter_two_id])):
            if fighter_id not in athlete_stats:
                athlete_stats[fighter_id] = {"wins": 0, "total": 0}
            athlete_stats[fighter_id]["total"] += 1

        # Track wins
        if fight.winner_id is not None:
            if fight.winner_id not in athlete_stats:
                athlete_stats[fight.winner_id] = {"wins": 0, "total": 0}
            athlete_stats[fight.winner_id]["wins"] += 1

    avg_duration = round(total_duration / duration_count) if duration_count > 0 else 0
    avg_tp = round(total_tp / tp_count, 1) if tp_count > 0 else 0.0
    avg_cp = round(total_cp / cp_count, 1) if cp_count > 0 else 0.0

    # Top performers - resolve athlete names and teams
    athlete_ids = list(athlete_stats.keys())
    athletes = session.exec(
        select(Athlete).where(Athlete.id.in_(athlete_ids))
    ).all() if athlete_ids else []

    athlete_map = {a.id: a for a in athletes}

    # Get team info
    team_ids = list(set(a.team_id for a in athletes if a.team_id))
    teams = session.exec(
        select(Team).where(Team.id.in_(team_ids))
    ).all() if team_ids else []
    team_map = {t.id: t for t in teams}

    # Get person info for name lookup
    person_ids = list(set(a.person_id for a in athletes if a.person_id))
    persons = session.exec(
        select(Person).where(Person.id.in_(person_ids))
    ).all() if person_ids else []
    person_map = {p.id: p for p in persons}

    # Build top performers list sorted by wins desc
    top_performers = []
    for athlete_id, stats in athlete_stats.items():
        athlete = athlete_map.get(athlete_id)
        if not athlete:
            continue
        team = team_map.get(athlete.team_id) if athlete.team_id else None
        person = person_map.get(athlete.person_id) if athlete.person_id else None
        win_rate = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
        top_performers.append({
            "name": person.full_name if person else "Unknown",
            "wins": stats["wins"],
            "total_fights": stats["total"],
            "win_rate": win_rate,
            "person_id": athlete.person_id,
            "team_name": team.name if team else None,
            "country": team.country_iso_code if team else None,
        })

    top_performers.sort(key=lambda x: (-x["wins"], -x["win_rate"]))
    top_performers = top_performers[:15]

    # Team performance
    team_stats: dict[int, dict] = {}
    for athlete_id, stats in athlete_stats.items():
        athlete = athlete_map.get(athlete_id)
        if not athlete or not athlete.team_id:
            continue
        tid = athlete.team_id
        if tid not in team_stats:
            team = team_map.get(tid)
            team_stats[tid] = {
                "name": team.name if team else "Unknown",
                "country": team.country_iso_code if team else None,
                "wins": 0,
                "losses": 0,
                "total_fights": 0,
            }
        team_stats[tid]["wins"] += stats["wins"]
        team_stats[tid]["total_fights"] += stats["total"]
        team_stats[tid]["losses"] = team_stats[tid]["total_fights"] - team_stats[tid]["wins"]

    team_performance = []
    for tid, ts in team_stats.items():
        win_rate = round(ts["wins"] / ts["total_fights"] * 100, 1) if ts["total_fights"] > 0 else 0
        team_performance.append({
            "name": ts["name"],
            "country": ts["country"],
            "wins": ts["wins"],
            "losses": ts["losses"],
            "total_fights": ts["total_fights"],
            "win_rate": win_rate,
        })

    team_performance.sort(key=lambda x: (-x["win_rate"], -x["wins"]))

    return {
        "event_id": event_id,
        "event_name": event.name,
        "total_fights": total_fights,
        "victory_type_distribution": dict(victory_types),
        "avg_duration": avg_duration,
        "avg_tp": avg_tp,
        "avg_cp": avg_cp,
        "top_performers": top_performers,
        "team_performance": team_performance,
    }
