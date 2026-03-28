"""Athletes list PDF export"""
from io import BytesIO
from typing import List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from ..utils.font_manager import font_manager


def generate_athletes_list_pdf(event_name: str, athletes: List[Dict[str, Any]]) -> bytes:
    """Generate athletes list PDF and return raw bytes."""
    font_name = font_manager.default_font
    font_bold = font_manager.bold_font

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = font_name

    elements = []

    header_table = Table([[
        Paragraph(f"<b>{event_name}</b>", styles["Normal"]),
        Paragraph("<b>ZOZNAM ATLÉTOV</b>", styles["Normal"]),
    ]], colWidths=[4.5 * inch, 2 * inch])
    header_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.2 * inch))

    table_data = [["#", "Meno", "Tím"]]
    for idx, athlete in enumerate(athletes, 1):
        table_data.append([str(idx), athlete.get("personFullName", ""), athlete.get("teamName", "-")])

    data_table = Table(table_data, colWidths=[0.5 * inch, 3 * inch, 3 * inch], repeatRows=1)
    data_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), font_bold),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), font_name),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("ALIGN", (1, 1), (2, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(data_table)
    elements.append(Spacer(1, 0.3 * inch))

    footer_table = Table(
        [[Paragraph(f"<b>Celkový počet atlétov: {len(athletes)}</b>", styles["Normal"])]],
        colWidths=[6.5 * inch],
    )
    footer_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (0, 0), 12),
    ]))
    elements.append(footer_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
