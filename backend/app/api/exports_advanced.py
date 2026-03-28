from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlmodel import Session, select
from typing import Dict, Any
from io import BytesIO
from datetime import datetime
import os

from ..database import get_session
from ..domain import SportEvent, Team, Athlete, WeightCategory
from ..services.arena import fetch_arena_data
from ..exports.documents.detailed_statistics_export import DetailedStatisticsExport
from ..exports.documents.certificate_export import CertificateExport

router = APIRouter()


@router.get("/export/statistics/{sportEventId}/xlsx")
async def export_detailed_statistics(sportEventId: str, session: Session = Depends(get_session)):
    """
    Generate comprehensive Excel file with detailed statistics

    Args:
        sportEventId: Sport event UUID

    Returns Excel file with multiple sheets:
    - Overview: Event details and summary statistics
    - Teams: All teams with athlete counts
    - Athletes: Complete athletes list
    - Categories: Weight categories statistics
    - Results: Fight results (if available)
    """
    try:
        export = DetailedStatisticsExport(sport_event_id=sportEventId, session=session)
        await export.fetch_data_async()
        buffer = export.generate()

        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=export.get_response_headers()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate statistics Excel: {str(e)}")


@router.get("/export/certificate/{athleteId}/pdf")
async def generate_certificate(athleteId: str, session: Session = Depends(get_session)):
    """
    Generate participation/achievement certificate PDF

    Args:
        athleteId: Athlete UUID

    Returns PDF certificate with:
    - Official design
    - Athlete name
    - Event name and date
    - Placement (if winner)
    - QR code for verification
    """
    try:
        export = CertificateExport(athlete_id=athleteId, session=session)
        buffer = export.generate()

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers=export.get_response_headers()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate certificate: {str(e)}")
