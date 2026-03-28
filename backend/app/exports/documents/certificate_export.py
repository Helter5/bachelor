"""
Certificate PDF Export
"""
from typing import List
from uuid import UUID
from io import BytesIO

from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import Flowable, Image
from reportlab.lib.units import inch
from sqlmodel import Session, select
import qrcode

from ..base.pdf_base import BasePDFExport
from ..builders.pdf_builder import PDFTableBuilder, PDFSpacerBuilder
from ..utils.formatters import formatter
from ..utils.styling import ColorPalette
from ...domain import SportEvent, Team, Athlete, WeightCategory, Person


class CertificateExport(BasePDFExport):
    """Export for participation/achievement certificate PDF"""

    def __init__(self, athlete_id: str, session: Session):
        """
        Initialize certificate export

        Args:
            athlete_id: Athlete UUID
            session: Database session
        """
        super().__init__(pagesize=landscape(A4), top_margin=0.8, bottom_margin=0.8, left_margin=1, right_margin=1)
        self.athlete_id = athlete_id
        self.session = session

    def fetch_data(self) -> None:
        """Fetch athlete, team, event, and category data"""
        # Get athlete
        athlete = self.session.exec(
            select(Athlete).where(Athlete.id == UUID(self.athlete_id))
        ).first()

        if not athlete:
            raise ValueError(f"Athlete {self.athlete_id} not found")

        # Get related data
        team = self.session.exec(
            select(Team).where(Team.id == athlete.team_id)
        ).first() if athlete.team_id else None

        event = self.session.exec(
            select(SportEvent).where(SportEvent.id == athlete.sport_event_id)
        ).first()

        weight_category = self.session.exec(
            select(WeightCategory).where(WeightCategory.id == athlete.weight_category_id)
        ).first() if athlete.weight_category_id else None

        person = self.session.get(Person, athlete.person_id) if athlete.person_id else None

        # Store in metadata
        self.metadata = {
            'athlete': athlete,
            'team': team,
            'event': event,
            'weight_category': weight_category,
            'person': person,
        }

    def validate_data(self) -> None:
        """Validate that athlete exists"""
        if not self.metadata.get('athlete'):
            raise ValueError("Athlete not found")

    def build_content(self) -> List[Flowable]:
        """Build certificate content"""
        elements = []
        athlete = self.metadata['athlete']
        team = self.metadata['team']
        event = self.metadata['event']
        weight_category = self.metadata['weight_category']
        person = self.metadata['person']

        # Top border
        border_table = PDFTableBuilder([['']], col_widths=[9.5]).build()
        border_table.setStyle([
            ('LINEABOVE', (0, 0), (0, 0), 3, ColorPalette.DARK_GRAY),
        ])
        elements.append(border_table)
        elements.append(PDFSpacerBuilder.create(0.3))

        # Title
        title_data = [["CERTIFIKÁT"]]
        title_table = PDFTableBuilder(title_data, col_widths=[9.5]).build()
        title_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'DejaVuSans-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 32),
            ('TEXTCOLOR', (0, 0), (0, 0), ColorPalette.DARK_GRAY),
        ])
        elements.append(title_table)
        elements.append(PDFSpacerBuilder.create(0.2))

        # Subtitle
        subtitle_data = [["O účasti na športovom podujatí"]]
        subtitle_table = PDFTableBuilder(subtitle_data, col_widths=[9.5]).build()
        subtitle_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'DejaVuSans'),
            ('FONTSIZE', (0, 0), (0, 0), 14),
            ('TEXTCOLOR', (0, 0), (0, 0), ColorPalette.MEDIUM_GRAY),
        ])
        elements.append(subtitle_table)
        elements.append(PDFSpacerBuilder.create(0.4))

        # "This certifies that"
        certifies_data = [["Týmto potvrdzujeme, že"]]
        certifies_table = PDFTableBuilder(certifies_data, col_widths=[9.5]).build()
        certifies_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'DejaVuSans'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
        ])
        elements.append(certifies_table)
        elements.append(PDFSpacerBuilder.create(0.15))

        # Athlete name (large)
        name_data = [[person.full_name if person else "Atlét"]]
        name_table = PDFTableBuilder(name_data, col_widths=[9.5]).build()
        name_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'DejaVuSans-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 24),
            ('TEXTCOLOR', (0, 0), (0, 0), ColorPalette.PRIMARY_BLUE),
            ('LINEBELOW', (0, 0), (0, 0), 2, ColorPalette.PRIMARY_BLUE),
        ])
        elements.append(name_table)
        elements.append(PDFSpacerBuilder.create(0.3))

        # Description
        desc_data = [["úspešne absolvoval/a turnaj v zápasení"]]
        desc_table = PDFTableBuilder(desc_data, col_widths=[9.5]).build()
        desc_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'DejaVuSans'),
            ('FONTSIZE', (0, 0), (0, 0), 11),
        ])
        elements.append(desc_table)
        elements.append(PDFSpacerBuilder.create(0.15))

        # Event details
        team_name = team.name if team else "N/A"
        event_name = event.name if event else "Športové podujatie"
        category_name = weight_category.name if weight_category else "N/A"
        event_date = formatter.date.format_date(event.start_date) if event and event.start_date else "N/A"

        details_data = [
            [f'Turnaj: {event_name}'],
            [f'Dátum: {event_date}'],
            [f'Tím: {team_name}'],
            [f'Kategória: {category_name}'],
        ]

        details_table = PDFTableBuilder(details_data, col_widths=[9.5]).build()
        details_table.setStyle([
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (0, -1), 'DejaVuSans'),
            ('FONTSIZE', (0, 0), (0, -1), 10),
            ('TOPPADDING', (0, 0), (0, -1), 3),
            ('BOTTOMPADDING', (0, 0), (0, -1), 3),
        ])
        elements.append(details_table)
        elements.append(PDFSpacerBuilder.create(0.4))

        # Footer with QR code
        qr_image = self._generate_qr_code()
        footer_data = [[
            qr_image,
            f"Vydané: {formatter.date.format_date(None)}"
        ]]

        footer_table = PDFTableBuilder(footer_data, col_widths=[1, 8.5]).build()
        footer_table.setStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (1, 0), (1, 0), 'DejaVuSans'),
            ('FONTSIZE', (1, 0), (1, 0), 8),
            ('TEXTCOLOR', (1, 0), (1, 0), ColorPalette.GREY),
        ])
        elements.append(footer_table)

        return elements

    def _generate_qr_code(self) -> Image:
        """Generate QR code for verification"""
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(f"athlete:{self.athlete_id}")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)

        return Image(qr_buffer, width=0.8*inch, height=0.8*inch)

    def get_filename(self) -> str:
        """Get filename for export"""
        return f"certificate-{self.athlete_id}.pdf"
