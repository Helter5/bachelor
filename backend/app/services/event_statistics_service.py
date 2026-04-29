"""Service for aggregated sport event statistics."""
from collections import Counter
from fastapi import HTTPException, status
from sqlmodel import Session, select
from typing import Any, Iterable

from ..domain.entities.athlete import Athlete
from ..domain.entities.fight import Fight
from ..domain.entities.person import Person
from ..domain.entities.sport_event import SportEvent
from ..domain.entities.team import Team
from ..domain.schemas.responses import EventStatisticsOut


class EventStatisticsService:
    """Encapsulates event statistics queries and aggregation logic."""

    def __init__(self, session: Session):
        self.session = session

    def get_event_statistics(self, event_id: int) -> EventStatisticsOut:
        """Return aggregated statistics for a single event."""
        event = self.session.get(SportEvent, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id {event_id} not found",
            )

        fights = self.session.exec(
            select(Fight).where(Fight.sport_event_id == event_id)
        ).all()

        if not fights:
            return EventStatisticsOut(
                event_id=event_id,
                event_name=event.name,
                total_fights=0,
                victory_type_distribution={},
                avg_duration=0,
                avg_tp=0.0,
                avg_cp=0.0,
                top_performers=[],
                team_performance=[],
            )

        victory_types = Counter()
        total_duration = 0
        duration_count = 0
        total_tp = 0
        tp_count = 0
        total_cp = 0
        cp_count = 0
        athlete_stats: dict[int, dict[str, int]] = {}

        for fight in fights:
            if fight.victory_type:
                victory_types[fight.victory_type] += 1

            if fight.duration and fight.duration > 0:
                total_duration += fight.duration
                duration_count += 1

            for tp in [fight.tp_one, fight.tp_two]:
                if tp is not None:
                    total_tp += tp
                    tp_count += 1

            for cp in [fight.cp_one, fight.cp_two]:
                if cp is not None:
                    total_cp += cp
                    cp_count += 1

            for fighter_id in set(filter(None, [fight.fighter_one_id, fight.fighter_two_id])):
                athlete_stats.setdefault(fighter_id, {"wins": 0, "total": 0})
                athlete_stats[fighter_id]["total"] += 1

            if fight.winner_id is not None:
                athlete_stats.setdefault(fight.winner_id, {"wins": 0, "total": 0})
                athlete_stats[fight.winner_id]["wins"] += 1

        avg_duration = round(total_duration / duration_count) if duration_count > 0 else 0
        avg_tp = round(total_tp / tp_count, 1) if tp_count > 0 else 0.0
        avg_cp = round(total_cp / cp_count, 1) if cp_count > 0 else 0.0

        athlete_map, team_map, person_map = self._load_related_maps(athlete_stats.keys())
        top_performers = self._build_top_performers(athlete_stats, athlete_map, team_map, person_map)
        team_performance = self._build_team_performance(athlete_stats, athlete_map, team_map, person_map, fights)

        return EventStatisticsOut(
            event_id=event_id,
            event_name=event.name,
            total_fights=len(fights),
            victory_type_distribution=dict(victory_types),
            avg_duration=avg_duration,
            avg_tp=avg_tp,
            avg_cp=avg_cp,
            top_performers=top_performers,
            team_performance=team_performance,
        )

    def _load_related_maps(
        self,
        athlete_ids: Iterable[int],
    ) -> tuple[dict[int, Athlete], dict[int, Team], dict[int, Person]]:
        athlete_ids_list = list(athlete_ids)
        athletes = self.session.exec(
            select(Athlete).where(Athlete.id.in_(athlete_ids_list))
        ).all() if athlete_ids_list else []

        athlete_map = {athlete.id: athlete for athlete in athletes}

        team_ids = list({athlete.team_id for athlete in athletes if athlete.team_id})
        teams = self.session.exec(
            select(Team).where(Team.id.in_(team_ids))
        ).all() if team_ids else []
        team_map = {team.id: team for team in teams}

        person_ids = list({athlete.person_id for athlete in athletes if athlete.person_id})
        persons = self.session.exec(
            select(Person).where(Person.id.in_(person_ids))
        ).all() if person_ids else []
        person_map = {person.id: person for person in persons}

        return athlete_map, team_map, person_map

    def _build_top_performers(
        self,
        athlete_stats: dict[int, dict[str, int]],
        athlete_map: dict[int, Athlete],
        team_map: dict[int, Team],
        person_map: dict[int, Person],
    ) -> list[dict]:
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

        top_performers.sort(key=lambda item: (-item["wins"], -item["win_rate"]))
        return top_performers[:15]

    def _build_team_performance(
        self,
        athlete_stats: dict[int, dict[str, int]],
        athlete_map: dict[int, Athlete],
        team_map: dict[int, Team],
        person_map: dict[int, Person],
        fights: list[Fight],
    ) -> list[dict]:
        team_stats: dict[int, dict[str, Any]] = {}

        for athlete_id, stats in athlete_stats.items():
            athlete = athlete_map.get(athlete_id)
            if not athlete or not athlete.team_id:
                continue

            team_id = athlete.team_id
            if team_id not in team_stats:
                team = team_map.get(team_id)
                team_stats[team_id] = {
                    "name": team.name if team else "Unknown",
                    "country": team.country_iso_code if team else None,
                    "wins": 0,
                    "losses": 0,
                    "total_fights": 0,
                    "wins_by_type": Counter(),
                    "losses_by_type": Counter(),
                    "tp_for": 0,
                    "tp_against": 0,
                    "tp_count": 0,
                    "cp_for": 0,
                    "cp_against": 0,
                    "cp_count": 0,
                    "top_performer": None,
                }

            team_stats[team_id]["wins"] += stats["wins"]
            team_stats[team_id]["total_fights"] += stats["total"]
            team_stats[team_id]["losses"] = (
                team_stats[team_id]["total_fights"] - team_stats[team_id]["wins"]
            )

            person = person_map.get(athlete.person_id) if athlete.person_id else None
            win_rate = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            performer = {
                "name": person.full_name if person else "Unknown",
                "wins": stats["wins"],
                "total_fights": stats["total"],
                "win_rate": win_rate,
                "person_id": athlete.person_id,
            }
            current = team_stats[team_id]["top_performer"]
            if (
                current is None
                or performer["wins"] > current["wins"]
                or (performer["wins"] == current["wins"] and performer["win_rate"] > current["win_rate"])
            ):
                team_stats[team_id]["top_performer"] = performer

        for fight in fights:
            self._add_team_fight_metrics(team_stats, athlete_map, fight)

        team_performance = []
        for stats in team_stats.values():
            total_fights = int(stats["total_fights"])
            wins = int(stats["wins"])
            wins_by_type = dict(stats["wins_by_type"])
            dominant_victory_type = (
                max(wins_by_type.items(), key=lambda item: (item[1], item[0]))[0]
                if wins_by_type else None
            )
            team_performance.append({
                "name": stats["name"],
                "country": stats["country"],
                "wins": wins,
                "losses": int(stats["losses"]),
                "total_fights": total_fights,
                "win_rate": round(wins / total_fights * 100, 1) if total_fights > 0 else 0,
                "wins_by_type": wins_by_type,
                "losses_by_type": dict(stats["losses_by_type"]),
                "dominant_victory_type": dominant_victory_type,
                "avg_tp_for": round(stats["tp_for"] / stats["tp_count"], 1) if stats["tp_count"] > 0 else 0.0,
                "avg_tp_against": round(stats["tp_against"] / stats["tp_count"], 1) if stats["tp_count"] > 0 else 0.0,
                "avg_cp_for": round(stats["cp_for"] / stats["cp_count"], 1) if stats["cp_count"] > 0 else 0.0,
                "avg_cp_against": round(stats["cp_against"] / stats["cp_count"], 1) if stats["cp_count"] > 0 else 0.0,
                "top_performer": stats["top_performer"],
            })

        team_performance.sort(key=lambda item: (-item["win_rate"], -item["wins"]))
        return team_performance

    def _add_team_fight_metrics(
        self,
        team_stats: dict[int, dict[str, Any]],
        athlete_map: dict[int, Athlete],
        fight: Fight,
    ) -> None:
        sides = [
            (fight.fighter_one_id, fight.tp_one, fight.tp_two, fight.cp_one, fight.cp_two),
            (fight.fighter_two_id, fight.tp_two, fight.tp_one, fight.cp_two, fight.cp_one),
        ]

        for athlete_id, tp_for, tp_against, cp_for, cp_against in sides:
            athlete = athlete_map.get(athlete_id) if athlete_id else None
            if not athlete or not athlete.team_id or athlete.team_id not in team_stats:
                continue

            stats = team_stats[athlete.team_id]
            if tp_for is not None:
                stats["tp_for"] += tp_for
                stats["tp_count"] += 1
            if tp_against is not None:
                stats["tp_against"] += tp_against
            if cp_for is not None:
                stats["cp_for"] += cp_for
                stats["cp_count"] += 1
            if cp_against is not None:
                stats["cp_against"] += cp_against

        if not fight.victory_type or fight.winner_id is None:
            return

        winner = athlete_map.get(fight.winner_id)
        if winner and winner.team_id in team_stats:
            team_stats[winner.team_id]["wins_by_type"][fight.victory_type] += 1

        loser_id = None
        if fight.fighter_one_id == fight.winner_id:
            loser_id = fight.fighter_two_id
        elif fight.fighter_two_id == fight.winner_id:
            loser_id = fight.fighter_one_id

        loser = athlete_map.get(loser_id) if loser_id else None
        if loser and loser.team_id in team_stats:
            team_stats[loser.team_id]["losses_by_type"][fight.victory_type] += 1
