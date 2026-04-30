"""
Results Summary PDF Export
"""
from typing import List

from reportlab.platypus import Flowable
from sqlmodel import Session, select

from ..base.pdf_base import BasePDFExport
from ..builders.pdf_builder import (
    PDFTableBuilder,
    PDFTitleBuilder,
    PDFFooterBuilder,
    PDFSpacerBuilder,
    PDFStatisticsBoxBuilder,
    build_export_header,
)
from ..utils.formatters import formatter
from ..utils.styling import ColorPalette
from ...domain import SportEvent, Team, Athlete, WeightCategory, Person
from ...domain.entities.fight import Fight


class ResultsSummaryExport(BasePDFExport):
    """Export for comprehensive results summary PDF"""

    def __init__(self, event_id: int, session: Session):
        super().__init__()
        self.event_id = event_id
        self.session = session

    async def fetch_data_async(self) -> None:
        event = self.session.exec(
            select(SportEvent).where(SportEvent.id == self.event_id)
        ).first()

        if not event:
            raise ValueError(f"Sport event {self.event_id} not found")

        country_name = event.country_iso_code or 'N/A'

        weight_categories = self.session.exec(
            select(WeightCategory).where(WeightCategory.sport_event_id == event.id)
        ).all()
        teams = self.session.exec(select(Team).where(Team.sport_event_id == event.id)).all()
        athletes = self.session.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
        person_ids = [a.person_id for a in athletes if a.person_id]
        persons = self.session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []
        person_map = {p.id: p for p in persons}
        fights = self.session.exec(
            select(Fight).where(Fight.sport_event_id == event.id)
        ).all()

        self.metadata = {
            'event': event,
            'country_name': country_name,
            'weight_categories': weight_categories,
            'teams': teams,
            'athletes': athletes,
            'person_map': person_map,
            'fights': fights
        }

    def fetch_data(self) -> None:
        """Fetch data (sync version - will be called by base class)"""
        # This is a workaround since base class calls sync version
        # Actual data fetching is done in fetch_data_async
        pass

    def validate_data(self) -> None:
        """Validate that event exists"""
        if not self.metadata.get('event'):
            raise ValueError("Event not found")

    def build_content(self) -> List[Flowable]:
        """Build PDF content elements"""
        elements = []
        event = self.metadata['event']
        country_name = self.metadata['country_name']
        teams = self.metadata['teams']
        athletes = self.metadata['athletes']
        weight_categories = self.metadata['weight_categories']
        fights = self.metadata['fights']
        person_map = self.metadata['person_map']

        # Main title
        elements.extend(build_export_header(event.name or "Sport Event", "Súhrnné výsledky"))
        elements.append(PDFSpacerBuilder.create(0.05))

        # Event info
        locality = formatter.text.clean_locality(event.address_locality)
        info_data = [
            ['Miesto:', locality],
            ['Krajina:', country_name],
            ['Dátum od:', formatter.date.format_date(event.start_date)],
            ['Dátum do:', formatter.date.format_date(event.end_date)],
        ]

        info_table = PDFTableBuilder(info_data, col_widths=[2, 4.5]) \
            .with_custom_style(('FONTNAME', (0, 0), (0, -1), 'DejaVuSans-Bold')) \
            .with_custom_style(('FONTNAME', (1, 0), (1, -1), 'DejaVuSans')) \
            .with_custom_style(('FONTSIZE', (0, 0), (-1, -1), 11)) \
            .with_custom_style(('TOPPADDING', (0, 0), (-1, -1), 8)) \
            .with_custom_style(('BOTTOMPADDING', (0, 0), (-1, -1), 8)) \
            .build()
        elements.append(info_table)
        elements.append(PDFSpacerBuilder.create(0.3))

        # Statistics box
        stats_title = PDFTitleBuilder("Štatistiky turnaja", width=6.5) \
            .with_size(12) \
            .with_color(ColorPalette.WHITE) \
            .build()
        stats_title.setStyle([
            ('BACKGROUND', (0, 0), (0, 0), ColorPalette.PRIMARY_BLUE),
            ('TOPPADDING', (0, 0), (0, 0), 10),
            ('BOTTOMPADDING', (0, 0), (0, 0), 10),
        ])
        elements.append(stats_title)

        stats_box = PDFStatisticsBoxBuilder(width=6.5) \
            .add_stat(len(teams), "Krajín") \
            .add_stat(len(athletes), "Atlétov") \
            .add_stat(len(weight_categories), "Kategórií") \
            .add_stat(len(fights), "Zápasov") \
            .build()
        elements.append(stats_box)
        elements.append(PDFSpacerBuilder.create(0.4))

        # Winners by category
        winners_title = PDFTitleBuilder("Víťazi podľa kategórií", width=6.5) \
            .with_size(14) \
            .with_alignment('LEFT') \
            .build()
        elements.append(winners_title)
        elements.append(PDFSpacerBuilder.create(0.1))

        winners_table = self._build_winners_table(weight_categories, athletes, teams, person_map)
        if winners_table:
            elements.append(winners_table)
        else:
            no_results = PDFTableBuilder([["Žiadne výsledky k dispozícii"]], col_widths=[6.5]).build()
            elements.append(no_results)

        # Footer
        elements.append(PDFSpacerBuilder.create(0.4))
        footer = PDFFooterBuilder(width=6.5).build()
        elements.append(footer)

        return elements

    def _build_winners_table(
        self,
        weight_categories: List,
        athletes: List,
        teams: List,
        person_map: dict
    ) -> Flowable:
        """Build winners table"""
        winners_data = [['Kategória', 'Víťaz', 'Krajina']]

        # Group athletes by weight category
        category_athletes = {}
        for athlete in athletes:
            if athlete.weight_category_id and athlete.is_competing:
                cat_id = str(athlete.weight_category_id)
                if cat_id not in category_athletes:
                    category_athletes[cat_id] = []
                category_athletes[cat_id].append(athlete)

        for wc in weight_categories:
            cat_id = str(wc.id)
            cat_athletes = category_athletes.get(cat_id, [])

            if cat_athletes:
                winner = cat_athletes[0]
                team = next((t for t in teams if str(t.id) == str(winner.team_id)), None)

                winner_person = person_map.get(winner.person_id)
                winners_data.append([
                    wc.name or 'N/A',
                    winner_person.full_name if winner_person else 'N/A',
                    team.name if team else 'N/A'
                ])

        if len(winners_data) <= 1:
            return None

        return PDFTableBuilder(winners_data, col_widths=[1.5, 3.0, 2.0]) \
            .with_header(font_size=9) \
            .with_body(font_size=8) \
            .with_grid() \
            .with_column_alignment(0, 'CENTER') \
            .with_column_alignment(1, 'LEFT') \
            .with_column_alignment(2, 'LEFT') \
            .with_custom_style(('ROWBACKGROUNDS', (0, 1), (-1, -1),
                               [ColorPalette.WHITE, ColorPalette.VERY_LIGHT_GRAY])) \
            .build()

    def get_filename(self) -> str:
        """Get filename for export"""
        return f"results-summary-{self.event_id}.pdf"
