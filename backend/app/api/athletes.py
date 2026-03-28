"""
Athletes API Routes
Thin controller layer - delegates to AthleteService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from uuid import UUID
from sqlmodel import Session

from ..database import get_session
from ..services.athlete_service import AthleteService

router = APIRouter(prefix="/athlete")


def get_service(session: Session = Depends(get_session)) -> AthleteService:
    """Dependency injection for AthleteService"""
    return AthleteService(session)


@router.get("/{sport_event_id}")
async def get_athletes(
    sport_event_id: str,
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch athletes for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns athletes data
    """
    try:
        return await service.get_athletes_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch athletes for event {sport_event_id}: {str(e)}"
        )


@router.get("/database/all")
async def get_all_athletes_from_database(
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch all athletes from local database with related data

    Returns all athletes with team and weight category information
    """
    try:
        athletes_with_data = service.get_all_with_details()
        return {
            "success": True,
            "count": len(athletes_with_data),
            "athletes": athletes_with_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch all athletes from database: {str(e)}"
        )


@router.get("/database/{sport_event_id}")
async def get_athletes_from_database(
    sport_event_id: int,
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch athletes for a specific sport event from local database

    Args:
        sport_event_id: Sport event database ID
        team_id: Optional team ID to filter by

    Returns athletes from database
    """
    try:
        athletes_with_teams = service.get_athletes_by_event_with_teams(sport_event_id, team_id)

        return {
            "success": True,
            "count": len(athletes_with_teams),
            "athletes": [
                {
                    "id": athlete["id"],
                    "sport_event_id": athlete["sport_event_id"],
                    "person_full_name": athlete["person_full_name"],
                    "team_id": athlete["team_uid"],  # Return team UUID instead of integer FK
                    "weight_category_id": athlete["weight_category_id"],
                    "is_competing": athlete["is_competing"],
                }
                for athlete in athletes_with_teams
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch athletes from database: {str(e)}"
        )


@router.post("/sync")
async def sync_athletes(
    sport_event_id: str = Query(..., description="Sport event UUID from Arena API"),
    service: AthleteService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync athletes for a sport event from Arena API to database

    Args:
        sport_event_id: Sport event UUID (from Arena API)

    Returns success message with count of synced athletes
    """
    try:
        return await service.sync_athletes_for_event(sport_event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync athletes: {str(e)}"
        )


@router.get("/{sportEventId}/print")
async def generate_athletes_list_pdf(sportEventId: str):
    """
    Generate PDF with athletes list for a specific sport event

    Args:
        sportEventId: Sport event UUID

    Returns PDF file with athletes list
    """
    from fastapi.responses import Response
    from io import BytesIO
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from ..services.arena import fetch_arena_data
    
    # Register UTF-8 compatible fonts
    import os
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu-core/DejaVuSans.ttf',
    ]
    font_bold_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu-core/DejaVuSans-Bold.ttf',
    ]
    
    font_name = 'Helvetica'
    font_bold = 'Helvetica-Bold'
    
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))
                font_name = 'DejaVuSans'
                break
            except:
                pass
    
    for font_path in font_bold_paths:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', font_path))
                font_bold = 'DejaVuSans-Bold'
                break
            except:
                pass

    try:
        # Fetch event details
        event_data = await fetch_arena_data(f"sport-event/get/{sportEventId}")
        if not event_data or "event" not in event_data:
            raise HTTPException(status_code=404, detail=f"Sport event {sportEventId} not found")

        event = event_data["event"]
        event_name = event.get("fullName", "Sport Event")

        # Fetch athletes data
        athletes_data = await fetch_arena_data(f"athlete/{sportEventId}")
        if not athletes_data or "athletes" not in athletes_data:
            raise HTTPException(status_code=404, detail=f"Athletes not found for event {sportEventId}")

        athletes_list = athletes_data["athletes"].get("items", [])
        athletes_list.sort(key=lambda x: x.get("personFullName", ""))

        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()
        
        # Update default styles to use UTF-8 font
        for style in styles.byName.values():
            style.fontName = font_name

        # Header
        header_data = [[
            Paragraph(f"<b>{event_name}</b>", styles['Normal']),
            Paragraph("<b>ZOZNAM ATLÉTOV</b>", styles['Normal'])
        ]]
        header_table = Table(header_data, colWidths=[4.5*inch, 2*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.2*inch))

        # Table
        table_data = [['#', 'Meno', 'Tím']]
        for idx, athlete in enumerate(athletes_list, 1):
            table_data.append([
                str(idx),
                athlete.get("personFullName", ""),
                athlete.get("teamName", "-"),
            ])

        athletes_table = Table(
            table_data,
            colWidths=[0.5*inch, 3*inch, 3*inch],
            repeatRows=1
        )
        athletes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), font_bold),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -1), font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))

        elements.append(athletes_table)
        elements.append(Spacer(1, 0.3*inch))

        # Footer
        footer_data = [[Paragraph(f"<b>Celkový počet atlétov: {len(athletes_list)}</b>", styles['Normal'])]]
        footer_table = Table(footer_data, colWidths=[6.5*inch])
        footer_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
        ]))
        elements.append(footer_table)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=athletes-list-{sportEventId}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
