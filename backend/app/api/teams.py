"""
Teams API Routes
Thin controller layer - delegates to TeamService
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any
from sqlmodel import Session

from ..database import get_session
from ..services.team_service import TeamService

router = APIRouter(prefix="/team")


def get_service(session: Session = Depends(get_session)) -> TeamService:
    """Dependency injection for TeamService"""
    return TeamService(session)


@router.get("/{sport_event_id}")
async def get_teams(
    sport_event_id: str,
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch teams for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns teams data for the specified sport event
    """
    try:
        return await service.get_teams_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch teams for event {sport_event_id}: {str(e)}"
        )


@router.get("/database/{sport_event_id}")
async def get_teams_from_database(
    sport_event_id: int,
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch teams for a specific sport event from local database

    Args:
        sport_event_id: Sport event database ID

    Returns teams from database
    """
    try:
        teams = service.get_teams_by_event(sport_event_id)
        # Return array directly (frontend expects Team[] with UUID as id)
        return [
            {
                "id": str(team.uid),  # Return UUID as string (not int primary key)
                "sport_event_id": team.sport_event_id,
                "name": team.name,
                "alternate_name": team.alternate_name,
                "country_iso_code": team.country_iso_code,
                "athlete_count": team.athlete_count,
                "final_rank": team.final_rank,
            }
            for team in teams
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch teams from database: {str(e)}"
        )


@router.post("/sync")
async def sync_teams(
    sport_event_id: str = Query(..., description="Sport event UUID from Arena API"),
    service: TeamService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync teams for a sport event from Arena API to database

    Args:
        sport_event_id: Sport event UUID (from Arena API)

    Returns success message with count of synced teams
    """
    try:
        return await service.sync_teams_for_event(sport_event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync teams: {str(e)}"
        )


@router.get("/{sportEventId}/print")
async def generate_teams_list_pdf(sportEventId: str):
    """
    Generate PDF with teams list for a specific sport event

    Args:
        sportEventId: Sport event UUID

    Returns PDF file with teams list in the format:
    - Header: Event name (left), "TEAMS LIST" (right)
    - Table: Number, Flag, ISO, Country name, Number of athletes
    - Footer: Total number of athletes
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
        # Fetch event details to get the event name
        event_data = await fetch_arena_data(f"sport-event/get/{sportEventId}")
        if not event_data or "event" not in event_data:
            raise HTTPException(status_code=404, detail=f"Sport event {sportEventId} not found")

        event = event_data["event"]
        event_name = event.get("fullName", "Sport Event")

        # Fetch teams data
        teams_data = await fetch_arena_data(f"team/{sportEventId}")
        if not teams_data or "sportEventTeams" not in teams_data:
            raise HTTPException(status_code=404, detail=f"Teams not found for event {sportEventId}")

        teams_list = teams_data["sportEventTeams"].get("items", [])

        # Sort teams by name
        teams_list.sort(key=lambda x: x.get("name", ""))

        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        
        # Update default styles to use UTF-8 font
        for style in styles.byName.values():
            style.fontName = font_name

        # Header with event name and "TEAMS LIST"
        header_data = [[
            Paragraph(f"<b>{event_name}</b>", styles['Normal']),
            Paragraph("<b>TEAMS LIST</b>", styles['Normal'])
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

        # Table header
        table_data = [['#', 'ISO', 'Krajina', 'Počet atlétov']]

        # Table rows
        total_athletes = 0
        for idx, team in enumerate(teams_list, 1):
            athlete_count = team.get("athleteCount", 0)
            total_athletes += athlete_count
            table_data.append([
                str(idx),
                team.get("alternateName", ""),
                team.get("name", ""),
                str(athlete_count)
            ])

        # Create the table with repeatRows=1 to repeat header on each page
        teams_table = Table(
            table_data,
            colWidths=[0.5*inch, 0.8*inch, 3.9*inch, 1.3*inch],
            repeatRows=1  # Repeat header row on each page
        )
        teams_table.setStyle(TableStyle([
            # Header style
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), font_bold),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # Body style
            ('FONTNAME', (0, 1), (-1, -1), font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # # column
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # ISO column
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),    # Country column
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Athletes column

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))

        elements.append(teams_table)
        elements.append(Spacer(1, 0.3*inch))

        # Total athletes footer
        footer_data = [[Paragraph(f"<b>Celkový počet atlétov: {total_athletes}</b>", styles['Normal'])]]
        footer_table = Table(footer_data, colWidths=[6.5*inch])
        footer_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
        ]))
        elements.append(footer_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=teams-list-{sportEventId}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
