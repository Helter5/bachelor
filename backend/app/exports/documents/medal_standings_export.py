"""
Medal Standings PDF Export
"""
from typing import List, Dict, Any
from io import BytesIO

from reportlab.platypus import Flowable, Spacer, Image
from reportlab.lib.units import inch
from sqlmodel import Session, select
import matplotlib.pyplot as plt
import matplotlib

from ..base.pdf_base import BasePDFExport
from ..builders.pdf_builder import (
    PDFTableBuilder,
    PDFTitleBuilder,
    PDFFooterBuilder,
    PDFSpacerBuilder
)
from ..utils.styling import ColorPalette
from ..utils.formatters import formatter
from ...domain import SportEvent, Team
from ...services.arena import fetch_arena_data

matplotlib.use('Agg')  # Non-GUI backend


class MedalStandingsExport(BasePDFExport):
    """Export for medal standings PDF"""

    def __init__(self, sport_event_id: str, session: Session):
        """
        Initialize medal standings export

        Args:
            sport_event_id: Sport event UUID
            session: Database session
        """
        super().__init__()
        self.sport_event_id = sport_event_id
        self.session = session

    def fetch_data(self) -> None:
        """Fetch event, teams, and calculate medal standings"""
        event = self.session.exec(
            select(SportEvent).where(SportEvent.arena_uuid == self.sport_event_id)
        ).first()

        if not event:
            raise ValueError(f"Sport event {self.sport_event_id} not found")

        teams = self.session.exec(
            select(Team).where(Team.sport_event_id == event.id)
        ).all()

        medal_standings = self._calculate_medal_standings(teams)

        sorted_standings = sorted(
            medal_standings.items(),
            key=lambda x: (x[1]['gold'], x[1]['silver'], x[1]['bronze']),
            reverse=True
        )

        self.metadata = {
            'event': event,
            'teams': teams,
            'medal_standings': medal_standings,
            'sorted_standings': sorted_standings
        }

    def _calculate_medal_standings(self, teams: List) -> Dict[str, Dict[str, Any]]:
        """
        Calculate medal standings from teams

        Args:
            teams: List of Team objects

        Returns:
            Dictionary of medal standings by country
        """
        medal_standings = {}

        for team in teams:
            country = team.name
            iso = team.alternate_name or team.country_iso_code

            if country not in medal_standings:
                medal_standings[country] = {
                    'iso': iso,
                    'gold': 0,
                    'silver': 0,
                    'bronze': 0,
                    'total': 0,
                    'final_rank': team.final_rank or 999
                }

        # Rank 1 = gold, 2 = silver, 3-4 = bronze
        for team in teams:
            country = team.name
            if team.final_rank:
                if team.final_rank == 1:
                    medal_standings[country]['gold'] += 1
                elif team.final_rank == 2:
                    medal_standings[country]['silver'] += 1
                elif team.final_rank in [3, 4]:
                    medal_standings[country]['bronze'] += 1

        for country in medal_standings:
            medal_standings[country]['total'] = (
                medal_standings[country]['gold'] +
                medal_standings[country]['silver'] +
                medal_standings[country]['bronze']
            )

        return medal_standings

    def validate_data(self) -> None:
        """Validate that event exists"""
        if not self.metadata.get('event'):
            raise ValueError("Event not found")

    def build_content(self) -> List[Flowable]:
        """Build PDF content elements"""
        elements = []
        event = self.metadata['event']
        sorted_standings = self.metadata['sorted_standings']

        title = PDFTitleBuilder(event.name or "Sport Event", width=6.5) \
            .with_size(16) \
            .build()
        elements.append(title)
        elements.append(PDFSpacerBuilder.create(0.2))

        subtitle = PDFTitleBuilder("Medailové poradie", width=6.5) \
            .with_size(14) \
            .build()
        elements.append(subtitle)
        elements.append(PDFSpacerBuilder.create(0.3))

        table_data = [['Por.', 'ISO', 'Krajina', 'Zlato', 'Striebro', 'Bronz', 'Celkom']]

        for idx, (country, medals) in enumerate(sorted_standings, 1):
            if medals['total'] > 0:
                table_data.append([
                    str(idx),
                    medals['iso'] or '',
                    country,
                    str(medals['gold']),
                    str(medals['silver']),
                    str(medals['bronze']),
                    str(medals['total'])
                ])

        medal_table = PDFTableBuilder(
            data=table_data,
            col_widths=[0.5, 0.7, 2.5, 0.8, 0.9, 0.8, 0.8]
        ).with_header() \
         .with_body() \
         .with_grid() \
         .with_medal_highlights() \
         .with_column_alignment(0, 'CENTER') \
         .with_column_alignment(1, 'CENTER') \
         .with_column_alignment(2, 'LEFT') \
         .build()

        elements.append(medal_table)
        elements.append(PDFSpacerBuilder.create(0.3))

        chart = self._create_pie_chart(sorted_standings)
        if chart:
            elements.append(chart)

        elements.append(PDFSpacerBuilder.create(0.3))
        footer = PDFFooterBuilder(width=6.5).build()
        elements.append(footer)

        return elements

    def _create_pie_chart(self, sorted_standings: List) -> Flowable:
        """
        Create pie chart for top 5 countries

        Args:
            sorted_standings: Sorted medal standings

        Returns:
            Image flowable or None
        """
        if len(sorted_standings) == 0:
            return None

        top_countries = sorted_standings[:5]
        country_names = [country for country, _ in top_countries]
        total_medals = [medals['total'] for _, medals in top_countries]

        if sum(total_medals) == 0:
            return None

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.pie(
            total_medals,
            labels=country_names,
            autopct='%1.1f%%',
            colors=ColorPalette.CHART_COLORS[:len(top_countries)]
        )
        ax.set_title('Top 5 krajín podľa počtu medailí')

        chart_buffer = BytesIO()
        plt.savefig(chart_buffer, format='png', bbox_inches='tight', dpi=100)
        plt.close()
        chart_buffer.seek(0)

        chart_image = Image(chart_buffer, width=4*inch, height=2.7*inch)
        chart_table = PDFTableBuilder([[chart_image]], col_widths=[6.5]) \
            .with_custom_style(('ALIGN', (0, 0), (0, 0), 'CENTER')) \
            .build()

        return chart_table

    def get_filename(self) -> str:
        """Get filename for export"""
        return f"medal-standings-{self.sport_event_id}.pdf"
