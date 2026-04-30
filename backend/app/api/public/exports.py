"""Authenticated API - event exports (PDF and Excel)"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session
from sqlmodel import select

from ...database import get_session
from ...domain import Athlete, Person, SportEvent, Team
from ...exports.documents.medal_standings_export import MedalStandingsExport
from ...exports.documents.results_summary_export import ResultsSummaryExport
from ...exports.documents.detailed_statistics_export import DetailedStatisticsExport
from ...exports.documents.athletes_list_export import generate_athletes_list_pdf
from ...exports.documents.teams_list_export import generate_teams_list_pdf

router = APIRouter(prefix="/events")


def _get_event(event_id: int, session: Session) -> SportEvent:
    event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
    if not event:
        raise ValueError(f"Sport event {event_id} not found")
    return event


@router.get("/{event_id}/exports/teams-list")
def export_teams_list(
    event_id: int,
    session: Session = Depends(get_session),
):
    """Generate PDF with teams list for a sport event."""
    try:
        event = _get_event(event_id, session)
        teams = session.exec(select(Team).where(Team.sport_event_id == event_id)).all()
        athletes = session.exec(select(Athlete).where(Athlete.sport_event_id == event_id)).all()

        team_athlete_counts: dict[int, int] = {}
        for athlete in athletes:
            if athlete.team_id is not None:
                team_athlete_counts[athlete.team_id] = team_athlete_counts.get(athlete.team_id, 0) + 1

        teams_data = sorted(
            [
                {
                    "name": team.name or "",
                    "alternateName": team.alternate_name or team.country_iso_code or "",
                    "athleteCount": team_athlete_counts.get(team.id, 0),
                }
                for team in teams
            ],
            key=lambda item: item["name"],
        )

        return Response(
            content=generate_teams_list_pdf(event.name or "Sport Event", teams_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=teams-list-{event_id}.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{event_id}/exports/athletes-list")
def export_athletes_list(
    event_id: int,
    session: Session = Depends(get_session),
):
    """Generate PDF with athletes list for a sport event."""
    try:
        event = _get_event(event_id, session)
        athletes = session.exec(select(Athlete).where(Athlete.sport_event_id == event_id)).all()

        seen_persons: set[int] = set()
        unique_athletes = []
        for athlete in athletes:
            if athlete.person_id and athlete.person_id not in seen_persons:
                seen_persons.add(athlete.person_id)
                unique_athletes.append(athlete)

        person_ids = [athlete.person_id for athlete in unique_athletes if athlete.person_id]
        team_ids = list({athlete.team_id for athlete in unique_athletes if athlete.team_id})

        persons = session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []
        teams = session.exec(select(Team).where(Team.id.in_(team_ids))).all() if team_ids else []
        person_map = {person.id: person for person in persons}
        team_map = {team.id: team for team in teams}

        athletes_data = sorted(
            [
                {
                    "personFullName": person_map[athlete.person_id].full_name
                    if athlete.person_id and person_map.get(athlete.person_id)
                    else "",
                    "teamName": team_map[athlete.team_id].name
                    if athlete.team_id and team_map.get(athlete.team_id)
                    else "N/A",
                }
                for athlete in unique_athletes
            ],
            key=lambda item: item["personFullName"],
        )

        return Response(
            content=generate_athletes_list_pdf(event.name or "Sport Event", athletes_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=athletes-list-{event_id}.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{event_id}/exports/medal-standings")
def export_medal_standings(
    event_id: int,
    by: str = "teams",
    session: Session = Depends(get_session),
):
    """Generate PDF with medal standings for a sport event. by=teams|athletes"""
    try:
        export = MedalStandingsExport(event_id, session, by=by)
        buffer = export.generate()
        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=medal-standings-{event_id}.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{event_id}/exports/results-summary")
async def export_results_summary(
    event_id: int,
    session: Session = Depends(get_session),
):
    """Generate PDF with comprehensive results summary for a sport event."""
    try:
        export = ResultsSummaryExport(event_id, session)
        await export.fetch_data_async()
        buffer = export.generate()
        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=results-summary-{event_id}.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{event_id}/exports/statistics")
async def export_statistics(
    event_id: int,
    session: Session = Depends(get_session),
):
    """Generate Excel file with detailed statistics for a sport event."""
    try:
        export = DetailedStatisticsExport(event_id, session)
        await export.fetch_data_async()
        buffer = export.generate()
        return Response(
            content=buffer.read(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=statistics-{event_id}.xlsx"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
