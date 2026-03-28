"""
Team Performance PDF Export
"""
from typing import List
from uuid import UUID

from reportlab.platypus import Flowable
from sqlmodel import Session, select

from ..base.pdf_base import BasePDFExport
from ..builders.pdf_builder import (
    PDFTableBuilder,
    PDFTitleBuilder,
    PDFFooterBuilder,
    PDFSpacerBuilder,
    PDFStatisticsBoxBuilder
)
from ..utils.formatters import formatter
from ..utils.styling import ColorPalette
from ...domain import SportEvent, Team, Athlete, Person


class TeamPerformanceExport(BasePDFExport):
    """Export for team performance report PDF"""

    def __init__(self, team_id: str, session: Session):
        """
        Initialize team performance export

        Args:
            team_id: Team UUID
            session: Database session
        """
        super().__init__()
        self.team_id = team_id
        self.session = session

    def fetch_data(self) -> None:
        """Fetch team, event, and athletes data"""
        # Get team
        team = self.session.exec(
            select(Team).where(Team.id == UUID(self.team_id))
        ).first()

        if not team:
            raise ValueError(f"Team {self.team_id} not found")

        # Get sport event
        event = self.session.exec(
            select(SportEvent).where(SportEvent.id == team.sport_event_id)
        ).first()

        # Get team athletes
        athletes = self.session.exec(
            select(Athlete).where(Athlete.team_id == UUID(self.team_id))
        ).all()

        person_ids = [a.person_id for a in athletes if a.person_id]
        persons = self.session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []
        person_map = {p.id: p for p in persons}

        # Store in metadata
        self.metadata = {
            'team': team,
            'event': event,
            'athletes': athletes,
            'person_map': person_map,
        }

    def validate_data(self) -> None:
        """Validate that team exists"""
        if not self.metadata.get('team'):
            raise ValueError("Team not found")

    def build_content(self) -> List[Flowable]:
        """Build PDF content elements"""
        elements = []
        team = self.metadata['team']
        event = self.metadata['event']
        athletes = self.metadata['athletes']
        person_map = self.metadata['person_map']

        # Title
        title = PDFTitleBuilder(f"Team Performance Report: {team.name}", width=6.5) \
            .with_size(16) \
            .build()
        elements.append(title)
        elements.append(PDFSpacerBuilder.create(0.2))

        # Event info
        if event:
            info_data = [
                ['Turnaj:', event.name or 'N/A'],
                ['Krajina:', team.country_iso_code or 'N/A'],
                ['Počet atlétov:', str(team.athlete_count or len(athletes))],
                ['Finálne umiestnenie:', formatter.number.format_rank(team.final_rank)],
            ]

            info_table = PDFTableBuilder(info_data, col_widths=[2.5, 4]) \
                .with_custom_style(('FONTNAME', (0, 0), (0, -1), 'DejaVuSans-Bold')) \
                .with_custom_style(('FONTNAME', (1, 0), (1, -1), 'DejaVuSans')) \
                .with_custom_style(('FONTSIZE', (0, 0), (-1, -1), 11)) \
                .with_custom_style(('TOPPADDING', (0, 0), (-1, -1), 8)) \
                .with_custom_style(('BOTTOMPADDING', (0, 0), (-1, -1), 8)) \
                .build()
            elements.append(info_table)
            elements.append(PDFSpacerBuilder.create(0.3))

        # Team Roster
        roster_title = PDFTitleBuilder("Zoznam atlétov", width=6.5) \
            .with_size(12) \
            .with_alignment('LEFT') \
            .with_color(ColorPalette.WHITE) \
            .build()
        roster_title.setStyle([
            ('BACKGROUND', (0, 0), (0, 0), ColorPalette.PRIMARY_BLUE),
            ('TOPPADDING', (0, 0), (0, 0), 10),
            ('BOTTOMPADDING', (0, 0), (0, 0), 10),
            ('LEFTPADDING', (0, 0), (0, 0), 10),
        ])
        elements.append(roster_title)
        elements.append(PDFSpacerBuilder.create(0.1))

        # Athletes table
        roster_data = [['#', 'Meno atlétova', 'Status', 'Akreditácia']]

        for idx, athlete in enumerate(athletes, 1):
            person = person_map.get(athlete.person_id) if athlete.person_id else None
            roster_data.append([
                str(idx),
                person.full_name if person else 'N/A',
                formatter.text.format_boolean(athlete.is_competing, 'Súťaží', 'Náhradník'),
                athlete.accreditation_status or 'N/A'
            ])

        roster_table = PDFTableBuilder(roster_data, col_widths=[0.5, 3.5, 1.5, 1.5]) \
            .with_header() \
            .with_body() \
            .with_grid() \
            .with_column_alignment(0, 'CENTER') \
            .with_column_alignment(1, 'LEFT') \
            .with_column_alignment(2, 'CENTER') \
            .with_column_alignment(3, 'CENTER') \
            .build()
        elements.append(roster_table)

        # Summary statistics
        elements.append(PDFSpacerBuilder.create(0.3))
        summary_title = PDFTitleBuilder("Súhrnné štatistiky", width=6.5) \
            .with_size(14) \
            .with_alignment('LEFT') \
            .build()
        elements.append(summary_title)
        elements.append(PDFSpacerBuilder.create(0.1))

        competing_count = len([a for a in athletes if a.is_competing])
        reserve_count = len(athletes) - competing_count

        stats_box = PDFStatisticsBoxBuilder(width=6.5) \
            .add_stat(len(athletes), "Celkovo atlétov") \
            .add_stat(competing_count, "Súťažiacich") \
            .add_stat(reserve_count, "Náhradníkov") \
            .build()
        elements.append(stats_box)

        # Footer
        elements.append(PDFSpacerBuilder.create(0.5))
        footer = PDFFooterBuilder(width=6.5).build()
        elements.append(footer)

        return elements

    def get_filename(self) -> str:
        """Get filename for export"""
        return f"team-report-{self.team_id}.pdf"
