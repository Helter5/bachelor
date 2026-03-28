"""
Sport Events API Routes
Thin controller layer - delegates to SportEventService
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from sqlmodel import Session

from ..database import get_session
from ..domain import SportEventCreate
from ..services.sport_event_service import SportEventService

router = APIRouter(prefix="/sport-event")


def get_service(session: Session = Depends(get_session)) -> SportEventService:
    """Dependency injection for SportEventService"""
    return SportEventService(session)


@router.get("/database")
async def get_sport_events_from_db(
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch all sport events from local database

    Returns list of synced sport events
    """
    try:
        events = service.get_all_from_database()
        return {
            "success": True,
            "count": len(events),
            "events": events
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch events from database: {str(e)}"
        )


@router.get("/")
async def get_sport_events(
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch all sport events from Arena API

    Returns list of sport events with their details
    """
    try:
        return await service.get_all_from_arena()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch sport events: {str(e)}"
        )


@router.get("/details/{event_id}")
async def get_sport_event_details(
    event_id: str,
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch details for a specific sport event from Arena API

    Args:
        event_id: Sport event UUID

    Returns detailed data for the specified sport event
    """
    try:
        return await service.get_details_from_arena(event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch sport event details for {event_id}: {str(e)}"
        )


@router.post("/sync")
async def sync_sport_event(
    event_data: SportEventCreate,
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Sync a sport event from Arena API to database

    Args:
        event_data: Sport event data

    Returns sync result
    """
    try:
        return await service.sync_event(event_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync sport event: {str(e)}"
        )


@router.get("/session/{sport_event_id}")
async def get_sessions(
    sport_event_id: str,
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch sessions for a specific sport event from Arena API

    Args:
        sport_event_id: Sport event UUID

    Returns sessions data for the specified sport event
    """
    try:
        return await service.get_sessions_from_arena(sport_event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch sessions for event {sport_event_id}: {str(e)}"
        )


@router.get("/{event_id}/start-list")
async def get_start_list(
    event_id: str,
    service: SportEventService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Fetch start list for a specific sport event from Arena API

    Returns filtered useful information including:
    - Event details (name, dates, location)
    - Country information
    - Counts (weight categories, teams, sessions, mats)
    - Weight categories grouped by sport and audience
    - Sports configuration
    - Mats information

    Args:
        event_id: Sport event UUID

    Returns filtered start list data
    """
    try:
        return await service.get_start_list(event_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch start list for event {event_id}: {str(e)}"
        )


@router.get("/{event_id}/start-list/print")
async def generate_start_list_pdf(event_id: str):
    """
    Generate PDF start list with athletes grouped by weight categories

    Returns PDF file with:
    - Event information
    - Athletes grouped by weight category (uses fight API to get participants)
    """
    from fastapi.responses import Response
    from io import BytesIO
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from collections import defaultdict
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
        event_data = await fetch_arena_data(f"sport-event/get/{event_id}")
        if not event_data or "event" not in event_data:
            raise HTTPException(status_code=404, detail=f"Sport event {event_id} not found")

        event = event_data["event"]
        event_name = event.get("name", "Sport Event")
        event_full_address = event.get("fullAddress", "")
        start_date = event.get("startDate", "")
        end_date = event.get("endDate", "")
        country_name = event.get("country", {}).get("name", "")
        country_code = event.get("country", {}).get("alternateName", "")
        count_teams = event.get("countTeams", 0)
        count_wc = event.get("countWeightCategories", 0)
        count_mats = event.get("countMats", 0)
        tournament_type_map = {
            "singlebracket": "Single Elimination",
            "doublebracket": "Double Elimination", 
            "roundrobin": "Round Robin"
        }
        tournament_type = tournament_type_map.get(event.get("tournamentType", ""), "Unknown")

        # Fetch weight categories
        wc_data = await fetch_arena_data(f"weight-category/{event_id}")
        weight_categories = wc_data.get("weightCategories", [])

        # Fetch fights to get all participants with their categories
        try:
            fights_data = await fetch_arena_data(f"fight/{event_id}")
            fights = fights_data.get("fights", [])
        except:
            fights = []

        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()
        
        # Update default styles to use UTF-8 font
        for style in styles.byName.values():
            style.fontName = font_name
        
        # Custom styles
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#1e40af'), alignment=TA_CENTER, spaceAfter=6, fontName=font_bold)
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#475569'), alignment=TA_CENTER, spaceAfter=12, fontName=font_name)
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1e293b'), spaceBefore=12, spaceAfter=8, fontName=font_bold)
        wc_style = ParagraphStyle('WCTitle', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor('#dc2626'), spaceBefore=15, spaceAfter=10, fontName=font_bold)

        # Main header
        elements.append(Paragraph(f"<b>{event_name}</b>", title_style))
        elements.append(Paragraph("<b>ŠTARTOVNÁ LISTINA</b>", title_style))
        elements.append(Paragraph(f"{event_full_address}", subtitle_style))
        elements.append(Spacer(1, 0.15*inch))

        # Event information table
        info_data = [
            ["Dátum:", f"{start_date} až {end_date}"],
            ["Miesto:", f"{event_full_address}"],
            ["Krajina:", f"{country_name} ({country_code})"],
            ["Typ turnaja:", tournament_type],
            ["Počet tímov:", str(count_teams)],
            ["Počet kategórií:", str(count_wc)],
            ["Počet rohov:", str(count_mats)],
        ]
        
        info_table = Table(info_data, colWidths=[1.5*inch, 4.5*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), font_bold),
            ('FONTNAME', (1, 0), (1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Section title for athletes
        elements.append(Paragraph("<b>ÚČASTNÍCI PODĽA KATEGÓRIÍ</b>", heading_style))
        elements.append(Spacer(1, 0.1*inch))

        # Group participants by weight category
        athletes_by_category = defaultdict(set)
        
        for fight in fights:
            wc_id = fight.get("sportEventWeightCategoryId")
            
            # Fighter 1
            fighter1_id = fight.get("fighter1Id")
            fighter1_name = fight.get("fighter1FullName")
            fighter1_team = fight.get("team1AlternateName", "-")
            
            if fighter1_id and fighter1_name:
                athletes_by_category[wc_id].add((fighter1_id, fighter1_name, fighter1_team))
            
            # Fighter 2
            fighter2_id = fight.get("fighter2Id")
            fighter2_name = fight.get("fighter2FullName")
            fighter2_team = fight.get("team2AlternateName", "-")
            
            if fighter2_id and fighter2_name:
                athletes_by_category[wc_id].add((fighter2_id, fighter2_name, fighter2_team))

        # Display athletes by weight category
        for wc in weight_categories:
            wc_id = wc.get("id")
            wc_name = wc.get("name", "Unknown Category")
            sport_name = wc.get("sportName", "")
            audience_name = wc.get("audienceName", "")
            
            # Full category name
            category_title = f"{wc_name} - {sport_name} {audience_name}"
            
            # Weight category header
            elements.append(Paragraph(f"<b>{category_title}</b>", wc_style))
            
            # Get athletes for this weight category
            wc_athletes = list(athletes_by_category.get(wc_id, set()))
            
            if wc_athletes:
                # Sort by name
                wc_athletes.sort(key=lambda x: x[1])
                
                # Create athletes table
                athlete_data = [['#', 'Meno', 'Tím']]
                
                for idx, (athlete_id, athlete_name, team) in enumerate(wc_athletes, 1):
                    athlete_data.append([
                        str(idx),
                        athlete_name,
                        team
                    ])
                
                athlete_table = Table(athlete_data, colWidths=[0.4*inch, 3.5*inch, 2.1*inch])
                athlete_table.setStyle(TableStyle([
                    # Header
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), font_bold),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    
                    # Body
                    ('FONTNAME', (0, 1), (-1, -1), font_name),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('ALIGN', (0, 1), (0, -1), 'CENTER'),
                    ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                    ('ALIGN', (2, 1), (2, -1), 'CENTER'),
                    
                    # Grid
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ('TOPPADDING', (0, 1), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ]))
                
                elements.append(athlete_table)
                
                # Count
                count_text = f"Počet atlétov: {len(wc_athletes)}"
                elements.append(Spacer(1, 0.05*inch))
                elements.append(Paragraph(f"<i>{count_text}</i>", styles['Normal']))
            else:
                # No athletes yet
                elements.append(Paragraph("<i>Zatiaľ žiadni prihlásení účastníci</i>", styles['Normal']))
            
            elements.append(Spacer(1, 0.15*inch))

        # Footer
        total_athletes = sum(len(athletes) for athletes in athletes_by_category.values())
        elements.append(Spacer(1, 0.2*inch))
        footer_text = f"<b>Celkový počet účastníkov: {total_athletes}</b>"
        elements.append(Paragraph(footer_text, styles['Normal']))

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=start-list-{event_id}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to generate start list PDF for event {event_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
