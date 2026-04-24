"""Public API - event exports (PDF and Excel)"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session

from ...database import get_session
from ...exports.documents.medal_standings_export import MedalStandingsExport
from ...exports.documents.results_summary_export import ResultsSummaryExport
from ...exports.documents.detailed_statistics_export import DetailedStatisticsExport

router = APIRouter(prefix="/events")


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
