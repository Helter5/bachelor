from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlmodel import Session, select, func
from typing import Dict, Any
from io import BytesIO
from datetime import datetime
import os

from ..database import get_session
from ..domain import SportEvent, Team, Athlete, WeightCategory
from ..services.arena import fetch_arena_data
from ..exports.documents.medal_standings_export import MedalStandingsExport
from ..exports.documents.results_summary_export import ResultsSummaryExport
from ..exports.documents.team_performance_export import TeamPerformanceExport

router = APIRouter()


@router.get("/export/medal-standings/{sportEventId}/pdf")
async def export_medal_standings(sportEventId: str, session: Session = Depends(get_session)):
    """
    Generate PDF with medal standings for a specific sport event

    Args:
        sportEventId: Sport event UUID

    Returns PDF file with medal standings:
    - Country rankings table
    - Gold, Silver, Bronze counts
    - Total medals
    - Pie chart visualization
    """
    try:
        export = MedalStandingsExport(sport_event_id=sportEventId, session=session)
        buffer = export.generate()

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers=export.get_response_headers()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate medal standings PDF: {str(e)}")


@router.get("/export/results-summary/{sportEventId}/pdf")
async def export_results_summary(sportEventId: str, session: Session = Depends(get_session)):
    """
    Generate comprehensive results summary PDF for fans and media

    Args:
        sportEventId: Sport event UUID

    Returns PDF with:
    - Event overview
    - Medal standings
    - All winners by weight category
    - Tournament statistics
    - Highlights
    """
    try:
        export = ResultsSummaryExport(sport_event_id=sportEventId, session=session)
        await export.fetch_data_async()
        buffer = export.generate()

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers=export.get_response_headers()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate results summary PDF: {str(e)}")


@router.get("/export/team-report/{teamId}/pdf")
async def export_team_performance(teamId: str, session: Session = Depends(get_session)):
    """
    Generate detailed team performance report PDF for coaches

    Args:
        teamId: Team UUID

    Returns PDF with:
    - Team roster
    - Individual athlete statistics
    - Win/Loss records
    - Victory methods breakdown
    - Performance comparison
    """
    try:
        export = TeamPerformanceExport(team_id=teamId, session=session)
        buffer = export.generate()

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers=export.get_response_headers()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate team performance report: {str(e)}")
