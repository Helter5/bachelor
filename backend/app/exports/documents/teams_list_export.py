"""Teams list PDF export"""
from io import BytesIO
from typing import List, Dict, Any
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, HRFlowable, Paragraph, Table, TableStyle

from ..utils.font_manager import font_manager
from ..utils.styling import ColorPalette
from ..builders.pdf_builder import (
    PDFTableBuilder,
    PDFFooterBuilder,
    PDFSpacerBuilder,
)


def generate_teams_list_pdf(event_name: str, teams: List[Dict[str, Any]]) -> bytes:
    """Generate teams list PDF and return raw bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )
    font_manager._register_fonts()

    elements = []

    # Title
    title_style = ParagraphStyle(
        "ExportTitle",
        fontName=font_manager.bold_font,
        fontSize=18,
        leading=22,
        textColor=ColorPalette.DARK_GRAY,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ExportSubtitle",
        fontName=font_manager.default_font,
        fontSize=11,
        leading=14,
        textColor=ColorPalette.MEDIUM_GRAY,
        spaceAfter=6,
    )
    elements.append(Paragraph(event_name, title_style))
    elements.append(Paragraph("Zoznam tímov", subtitle_style))
    elements.append(PDFSpacerBuilder.create(0.1))
    elements.append(HRFlowable(width="100%", thickness=2, color=ColorPalette.PRIMARY_BLUE, spaceAfter=10))
    elements.append(PDFSpacerBuilder.create(0.15))

    # Table
    total_athletes = sum(t.get("athleteCount", 0) for t in teams)
    table_data = [["#", "ISO", "Krajina", "Atlétov"]]
    for idx, team in enumerate(teams, 1):
        table_data.append([
            str(idx),
            team.get("alternateName", ""),
            team.get("name", ""),
            str(team.get("athleteCount", 0)),
        ])

    data_table = (
        PDFTableBuilder(table_data, col_widths=[0.5, 0.9, 4.2, 0.9])
        .with_header(bg_color=ColorPalette.DARK_GRAY, font_size=9)
        .with_body(font_size=9)
        .with_grid(line_width=0.3, color=ColorPalette.LIGHT_GRAY)
        .with_column_alignment(0, "CENTER")
        .with_column_alignment(1, "CENTER")
        .with_column_alignment(2, "LEFT")
        .with_column_alignment(3, "CENTER")
        .build()
    )
    data_table.repeatRows = 1
    elements.append(data_table)

    elements.append(PDFSpacerBuilder.create(0.25))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=ColorPalette.LIGHT_GRAY))
    elements.append(PDFSpacerBuilder.create(0.12))

    # Summary row
    summary = Table(
        [[f"Tímov celkom: {len(teams)}", f"Atlétov celkom: {total_athletes}"]],
        colWidths=[3.25 * inch, 3.25 * inch],
    )
    summary.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_manager.bold_font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), ColorPalette.DARK_GRAY),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(summary)

    elements.append(PDFSpacerBuilder.create(0.3))
    elements.append(PDFFooterBuilder(width=6.5).build())

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
