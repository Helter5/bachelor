"""
Detailed Statistics Excel Export
"""
from sqlmodel import Session, select

from ..base.excel_base import BaseExcelExport
from ..builders.excel_builder import ExcelSheetBuilder, ExcelTableBuilder
from ..utils.formatters import formatter
from ...domain import SportEvent, Team, Athlete, WeightCategory, Person
from ...services.arena import fetch_arena_data


class DetailedStatisticsExport(BaseExcelExport):
    """Export for detailed statistics Excel file"""

    def __init__(self, sport_event_id: str, session: Session):
        """
        Initialize detailed statistics export

        Args:
            sport_event_id: Sport event UUID
            session: Database session
        """
        super().__init__()
        self.sport_event_id = sport_event_id
        self.session = session

    async def fetch_data_async(self) -> None:
        """Fetch all required data (async version)"""
        # Get event
        event = self.session.exec(
            select(SportEvent).where(SportEvent.arena_uuid == self.sport_event_id)
        ).first()

        if not event:
            raise ValueError(f"Sport event {self.sport_event_id} not found")

        # Get related data
        teams = self.session.exec(select(Team).where(Team.sport_event_id == event.id)).all()
        athletes = self.session.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
        weight_categories = self.session.exec(
            select(WeightCategory).where(WeightCategory.sport_event_id == event.id)
        ).all()
        person_ids = [a.person_id for a in athletes if a.person_id]
        persons = self.session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []
        person_map = {p.id: p for p in persons}

        # Fetch fights from Arena API
        try:
            results_data = await fetch_arena_data(f"fight/{self.sport_event_id}")
            fights = results_data.get("fights", []) if results_data else []
        except Exception:
            fights = []

        # Store in metadata
        self.metadata = {
            'event': event,
            'teams': teams,
            'athletes': athletes,
            'weight_categories': weight_categories,
            'person_map': person_map,
            'fights': fights
        }

    def fetch_data(self) -> None:
        """Fetch data (sync version - will be called by base class)"""
        pass

    def validate_data(self) -> None:
        """Validate that event exists"""
        if not self.metadata.get('event'):
            raise ValueError("Event not found")

    def create_sheets(self) -> None:
        """Create all Excel sheets"""
        self._create_overview_sheet()
        self._create_teams_sheet()
        self._create_athletes_sheet()
        self._create_categories_sheet()

    def _create_overview_sheet(self) -> None:
        """Create overview sheet"""
        ws = self.workbook.active
        ws.title = "Prehľad"

        event = self.metadata['event']
        teams = self.metadata['teams']
        athletes = self.metadata['athletes']
        weight_categories = self.metadata['weight_categories']
        fights = self.metadata['fights']

        builder = ExcelSheetBuilder(ws)

        # Title
        builder.add_title_row("PREHĽAD TURNAJA", font_size=16, bold=True)
        builder.skip_rows(1)

        # Event info
        builder.add_label_value_row("Názov:", event.name or 'N/A')
        builder.add_label_value_row("Plný názov:", event.full_name or 'N/A')
        builder.add_label_value_row("Dátum od:", event.start_date if event.start_date else 'N/A')
        builder.add_label_value_row("Dátum do:", event.end_date if event.end_date else 'N/A')
        builder.add_label_value_row("Miesto:", event.address_locality or 'N/A')
        builder.add_label_value_row("Krajina:", event.country_iso_code or 'N/A')
        builder.skip_rows(1)

        # Statistics
        builder.add_title_row("ŠTATISTIKY", font_size=14, bold=True)
        builder.skip_rows(1)
        builder.add_label_value_row("Počet tímov:", len(teams))
        builder.add_label_value_row("Počet atlétov:", len(athletes))
        builder.add_label_value_row("Počet kategórií:", len(weight_categories))
        builder.add_label_value_row("Počet zápasov:", len(fights))

        # Column widths
        builder.set_column_widths([20, 40])

    def _create_teams_sheet(self) -> None:
        """Create teams sheet"""
        ws = self.workbook.create_sheet("Tímy")
        teams = self.metadata['teams']

        headers = ['Por.', 'ISO Kód', 'Krajina', 'Počet atlétov', 'Finálne umiestnenie']
        teams_sorted = sorted(teams, key=lambda t: t.name or '')

        data_rows = []
        for idx, team in enumerate(teams_sorted, 1):
            data_rows.append([
                idx,
                team.alternate_name or team.country_iso_code or '',
                team.name or '',
                team.athlete_count or 0,
                team.final_rank or ''
            ])

        ExcelTableBuilder() \
            .with_headers(headers) \
            .with_data(data_rows) \
            .with_column_widths([8, 12, 30, 15, 20]) \
            .build_to_sheet(ws)

    def _create_athletes_sheet(self) -> None:
        """Create athletes sheet"""
        ws = self.workbook.create_sheet("Atleti")
        athletes = self.metadata['athletes']
        teams = self.metadata['teams']
        weight_categories = self.metadata['weight_categories']
        person_map = self.metadata['person_map']

        headers = ['#', 'Meno', 'Tím', 'Váhová kategória', 'Súťaží', 'Akreditácia']

        # Create lookup dicts
        teams_dict = {str(t.id): t.name for t in teams}
        wc_dict = {str(wc.id): wc.name for wc in weight_categories}

        athletes_sorted = sorted(athletes, key=lambda a: (person_map.get(a.person_id).full_name if a.person_id and person_map.get(a.person_id) else ''))

        data_rows = []
        for idx, athlete in enumerate(athletes_sorted, 1):
            team_name = teams_dict.get(str(athlete.team_id), 'N/A') if athlete.team_id else 'N/A'
            wc_name = wc_dict.get(str(athlete.weight_category_id), 'N/A') if athlete.weight_category_id else 'N/A'
            person = person_map.get(athlete.person_id) if athlete.person_id else None

            data_rows.append([
                idx,
                person.full_name if person else '',
                team_name,
                wc_name,
                formatter.text.format_boolean(athlete.is_competing),
                athlete.accreditation_status or 'N/A'
            ])

        ExcelTableBuilder() \
            .with_headers(headers) \
            .with_data(data_rows) \
            .with_column_widths([8, 30, 25, 25, 10, 15]) \
            .build_to_sheet(ws)

    def _create_categories_sheet(self) -> None:
        """Create weight categories sheet"""
        ws = self.workbook.create_sheet("Kategórie")
        weight_categories = self.metadata['weight_categories']

        headers = ['#', 'Názov', 'Šport', 'Publikum', 'Max váha', 'Počet zápasníkov', 'Začaté', 'Dokončené']

        data_rows = []
        for idx, wc in enumerate(weight_categories, 1):
            data_rows.append([
                idx,
                wc.name or '',
                wc.sport_name or '',
                wc.audience_name or '',
                wc.max_weight or '',
                wc.count_fighters or 0,
                formatter.text.format_boolean(wc.is_started),
                formatter.text.format_boolean(wc.is_completed)
            ])

        ExcelTableBuilder() \
            .with_headers(headers) \
            .with_data(data_rows) \
            .with_column_widths([8, 25, 20, 15, 12, 18, 12, 12]) \
            .build_to_sheet(ws)

    def get_filename(self) -> str:
        """Get filename for export"""
        return f"statistics-{self.sport_event_id}.xlsx"
