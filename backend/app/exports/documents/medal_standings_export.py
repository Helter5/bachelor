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
from ...domain import SportEvent, Team, Athlete, Person

matplotlib.use('Agg')  # Non-GUI backend


class MedalStandingsExport(BasePDFExport):
    """Export for medal standings PDF"""

    def __init__(self, event_id: int, session: Session, by: str = "teams"):
        super().__init__()
        self.event_id = event_id
        self.session = session
        self.by = by  # "teams" or "athletes"

    def fetch_data(self) -> None:
        """Fetch event, teams/athletes, and calculate medal standings"""
        event = self.session.exec(
            select(SportEvent).where(SportEvent.id == self.event_id)
        ).first()

        if not event:
            raise ValueError(f"Sport event {self.event_id} not found")

        teams = self.session.exec(
            select(Team).where(Team.sport_event_id == event.id)
        ).all()

        if self.by == "athletes":
            medal_standings = self._calculate_medal_standings_by_athletes(event.id, teams)
        else:
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

    def _calculate_medal_standings_by_athletes(self, event_id: int, teams: List) -> Dict[str, Dict[str, Any]]:
        """
        Calculate medal standings grouped by individual athlete (Person).

        Returns:
            Dictionary keyed by "{full_name}||{iso}" with medal counts per athlete
        """
        team_map = {team.id: team for team in teams}

        rows = self.session.exec(
            select(Athlete, Person)
            .where(Athlete.sport_event_id == event_id)
            .join(Person, Athlete.person_id == Person.id)
        ).all()

        medal_standings: Dict[str, Dict[str, Any]] = {}

        for athlete, person in rows:
            team = team_map.get(athlete.team_id)
            if not team or not team.final_rank:
                continue

            key = f"{person.full_name}||{person.country_iso_code or ''}"

            if key not in medal_standings:
                medal_standings[key] = {
                    'name': person.full_name,
                    'iso': person.country_iso_code or (team.alternate_name or team.country_iso_code or ''),
                    'country': team.name,
                    'gold': 0,
                    'silver': 0,
                    'bronze': 0,
                    'total': 0,
                }

            if team.final_rank == 1:
                medal_standings[key]['gold'] += 1
            elif team.final_rank == 2:
                medal_standings[key]['silver'] += 1
            elif team.final_rank in [3, 4]:
                medal_standings[key]['bronze'] += 1

        for key in medal_standings:
            d = medal_standings[key]
            d['total'] = d['gold'] + d['silver'] + d['bronze']

        # Remove athletes with no medals
        medal_standings = {k: v for k, v in medal_standings.items() if v['total'] > 0}

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

        if self.by == "athletes":
            subtitle_text = "Medailové poradie atlétov"
        else:
            subtitle_text = "Medailové poradie"

        subtitle = PDFTitleBuilder(subtitle_text, width=6.5) \
            .with_size(14) \
            .build()
        elements.append(subtitle)
        elements.append(PDFSpacerBuilder.create(0.3))

        if self.by == "athletes":
            table_data = [['Por.', 'Atlét', 'ISO', 'Krajina', 'Zlato', 'Striebro', 'Bronz', 'Celkom']]
            for idx, (key, medals) in enumerate(sorted_standings, 1):
                table_data.append([
                    str(idx),
                    medals['name'],
                    medals['iso'] or '',
                    medals['country'],
                    str(medals['gold']),
                    str(medals['silver']),
                    str(medals['bronze']),
                    str(medals['total'])
                ])
            medal_table = PDFTableBuilder(
                data=table_data,
                col_widths=[0.4, 1.8, 0.6, 1.5, 0.7, 0.8, 0.7, 0.7]
            ).with_header() \
             .with_body() \
             .with_grid() \
             .with_medal_highlights() \
             .with_column_alignment(0, 'CENTER') \
             .with_column_alignment(2, 'CENTER') \
             .with_column_alignment(1, 'LEFT') \
             .with_column_alignment(3, 'LEFT') \
             .build()
        else:
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

        chart = self._create_pie_chart(sorted_standings, by=self.by)
        if chart:
            elements.append(chart)

        elements.append(PDFSpacerBuilder.create(0.3))
        footer = PDFFooterBuilder(width=6.5).build()
        elements.append(footer)

        return elements

    def _create_pie_chart(self, sorted_standings: List, by: str = "teams") -> Flowable:
        """
        Create pie chart for top 5 entries (countries or athletes).

        Args:
            sorted_standings: Sorted medal standings
            by: "teams" or "athletes"

        Returns:
            Image flowable or None
        """
        if len(sorted_standings) == 0:
            return None

        top_entries = sorted_standings[:5]
        if by == "athletes":
            labels = [medals['name'] for _, medals in top_entries]
            chart_title = 'Top 5 atlétov podľa počtu medailí'
        else:
            labels = [key for key, _ in top_entries]
            chart_title = 'Top 5 krajín podľa počtu medailí'
        total_medals = [medals['total'] for _, medals in top_entries]

        if sum(total_medals) == 0:
            return None

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.pie(
            total_medals,
            labels=labels,
            autopct='%1.1f%%',
            colors=ColorPalette.CHART_COLORS[:len(top_entries)]
        )
        ax.set_title(chart_title)

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
        return f"medal-standings-{self.event_id}.pdf"
