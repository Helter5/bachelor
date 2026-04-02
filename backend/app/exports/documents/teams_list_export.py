"""Teams list PDF export"""
from typing import List, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from ..utils.font_manager import font_manager
from ..utils.styling import ColorPalette
from ..builders.pdf_builder import (
    PDFTableBuilder,
    PDFFooterBuilder,
    PDFSpacerBuilder,
    build_export_header,
)


def generate_teams_list_pdf(event_name: str, teams: List[Dict[str, Any]]) -> bytes:
    """Generate teams list PDF and return raw bytes."""
    from io import BytesIO
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

    elements = build_export_header(event_name, "Zoznam tímov")

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
