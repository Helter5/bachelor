"""
Detailed Statistics Excel Export
"""
from collections import Counter
from sqlmodel import Session, select

from ..base.excel_base import BaseExcelExport
from ..builders.excel_builder import ExcelSheetBuilder, ExcelTableBuilder
from ..utils.formatters import formatter
from ...domain import SportEvent, Team, Athlete, WeightCategory, Person, Fight, VictoryType


class DetailedStatisticsExport(BaseExcelExport):
    """Export for detailed statistics Excel file"""

    def __init__(self, sport_event_id: str, session: Session):
        super().__init__()
        self.sport_event_id = sport_event_id
        self.session = session

    async def fetch_data_async(self) -> None:
        """Fetch all required data from DB."""
        event = self.session.exec(
            select(SportEvent).where(SportEvent.arena_uuid == self.sport_event_id)
        ).first()

        if not event:
            raise ValueError(f"Sport event {self.sport_event_id} not found")

        teams = self.session.exec(select(Team).where(Team.sport_event_id == event.id)).all()
        athletes = self.session.exec(select(Athlete).where(Athlete.sport_event_id == event.id)).all()
        weight_categories = self.session.exec(
            select(WeightCategory).where(WeightCategory.sport_event_id == event.id)
        ).all()
        fights = self.session.exec(
            select(Fight).where(Fight.sport_event_id == event.id)
        ).all()
        victory_types = self.session.exec(select(VictoryType)).all()

        person_ids = list({a.person_id for a in athletes if a.person_id})
        persons = self.session.exec(select(Person).where(Person.id.in_(person_ids))).all() if person_ids else []

        self.metadata = {
            'event': event,
            'teams': teams,
            'athletes': athletes,
            'weight_categories': weight_categories,
            'fights': fights,
            'person_map': {p.id: p for p in persons},
            'athlete_map': {a.id: a for a in athletes},
            'team_map': {t.id: t for t in teams},
            'wc_map': {wc.id: wc for wc in weight_categories},
            'vt_map': {vt.code: vt.type for vt in victory_types},
        }

    def fetch_data(self) -> None:
        pass

    def validate_data(self) -> None:
        if not self.metadata.get('event'):
            raise ValueError("Event not found")

    def create_sheets(self) -> None:
        self._create_overview_sheet()
        self._create_teams_sheet()
        self._create_athletes_sheet()
        self._create_categories_sheet()
        self._create_results_sheet()
        self._create_statistics_sheet()

    # ------------------------------------------------------------------
    # Sheet: Prehľad
    # ------------------------------------------------------------------

    def _create_overview_sheet(self) -> None:
        ws = self.workbook.active
        ws.title = "Prehľad"

        event = self.metadata['event']
        teams = self.metadata['teams']
        athletes = self.metadata['athletes']
        weight_categories = self.metadata['weight_categories']
        fights = self.metadata['fights']

        builder = ExcelSheetBuilder(ws)
        builder.add_title_row("PREHĽAD TURNAJA", font_size=16, bold=True)
        builder.skip_rows(1)

        builder.add_label_value_row("Názov:", event.name or 'N/A')
        builder.add_label_value_row("Dátum od:", formatter.date.format_date(event.start_date))
        builder.add_label_value_row("Dátum do:", formatter.date.format_date(event.end_date))
        builder.add_label_value_row("Miesto:", event.address_locality or 'N/A')
        builder.add_label_value_row("Krajina:", event.country_iso_code or 'N/A')
        builder.skip_rows(1)

        builder.add_title_row("ŠTATISTIKY", font_size=14, bold=True)
        builder.skip_rows(1)
        builder.add_label_value_row("Počet tímov:", len(teams))
        builder.add_label_value_row("Počet atlétov:", len(athletes))
        builder.add_label_value_row("Počet váhových kategórií:", len(weight_categories))
        builder.add_label_value_row("Počet zápasov:", len(fights))

        builder.set_column_widths([28, 40])

    # ------------------------------------------------------------------
    # Sheet: Tímy
    # ------------------------------------------------------------------

    def _create_teams_sheet(self) -> None:
        ws = self.workbook.create_sheet("Tímy")
        teams = self.metadata['teams']

        teams_sorted = sorted(
            teams,
            key=lambda t: (t.final_rank or 9999, t.name or '')
        )
        data_rows = [
            [idx, team.alternate_name or team.country_iso_code or '', team.name or '',
             team.athlete_count or 0, team.final_rank or '']
            for idx, team in enumerate(teams_sorted, 1)
        ]

        ExcelTableBuilder() \
            .with_headers(['Por.', 'ISO', 'Krajina', 'Atlétov', 'Finálne umiestnenie']) \
            .with_data(data_rows) \
            .with_column_widths([8, 10, 32, 12, 22]) \
            .build_to_sheet(ws)

    # ------------------------------------------------------------------
    # Sheet: Atleti
    # ------------------------------------------------------------------

    def _create_athletes_sheet(self) -> None:
        ws = self.workbook.create_sheet("Atleti")
        athletes = self.metadata['athletes']
        person_map = self.metadata['person_map']
        team_map = self.metadata['team_map']
        wc_map = self.metadata['wc_map']

        athletes_sorted = sorted(
            athletes,
            key=lambda a: (person_map[a.person_id].full_name if a.person_id and person_map.get(a.person_id) else '')
        )
        data_rows = []
        for idx, athlete in enumerate(athletes_sorted, 1):
            person = person_map.get(athlete.person_id) if athlete.person_id else None
            team = team_map.get(athlete.team_id) if athlete.team_id else None
            wc = wc_map.get(athlete.weight_category_id) if athlete.weight_category_id else None
            data_rows.append([
                idx,
                person.full_name if person else '',
                team.name if team else 'N/A',
                wc.name if wc else 'N/A',
                formatter.text.format_boolean(athlete.is_competing),
            ])

        ExcelTableBuilder() \
            .with_headers(['#', 'Meno', 'Tím', 'Váhová kategória', 'Súťaží']) \
            .with_data(data_rows) \
            .with_column_widths([8, 32, 28, 20, 12]) \
            .build_to_sheet(ws)

    # ------------------------------------------------------------------
    # Sheet: Kategórie
    # ------------------------------------------------------------------

    def _create_categories_sheet(self) -> None:
        ws = self.workbook.create_sheet("Kategórie")
        weight_categories = self.metadata['weight_categories']
        fights = self.metadata['fights']

        fight_counts = Counter(f.weight_category_id for f in fights if f.weight_category_id)

        data_rows = [
            [idx, wc.name or '', wc.max_weight or '', wc.count_fighters or 0,
             fight_counts.get(wc.id, 0),
             formatter.text.format_boolean(wc.is_started),
             formatter.text.format_boolean(wc.is_completed)]
            for idx, wc in enumerate(weight_categories, 1)
        ]

        ExcelTableBuilder() \
            .with_headers(['#', 'Kategória', 'Max váha (kg)', 'Zápasníkov', 'Zápasov', 'Začatá', 'Dokončená']) \
            .with_data(data_rows) \
            .with_column_widths([8, 20, 14, 14, 12, 12, 14]) \
            .build_to_sheet(ws)

    # ------------------------------------------------------------------
    # Sheet: Výsledky
    # ------------------------------------------------------------------

    def _create_results_sheet(self) -> None:
        ws = self.workbook.create_sheet("Výsledky")
        fights = self.metadata['fights']
        athlete_map = self.metadata['athlete_map']
        person_map = self.metadata['person_map']
        wc_map = self.metadata['wc_map']
        vt_map = self.metadata['vt_map']

        def athlete_name(athlete_id):
            athlete = athlete_map.get(athlete_id)
            if not athlete:
                return ''
            person = person_map.get(athlete.person_id)
            return person.full_name if person else ''

        fights_sorted = sorted(fights, key=lambda f: (f.fight_number or 9999, f.id))
        data_rows = []
        for fight in fights_sorted:
            wc = wc_map.get(fight.weight_category_id)
            winner_id = fight.winner_id
            f1_name = athlete_name(fight.fighter_one_id)
            f2_name = athlete_name(fight.fighter_two_id)
            winner_name = athlete_name(winner_id) if winner_id else ''
            vt_name = vt_map.get(fight.victory_type, fight.victory_type or '')
            mins, secs = divmod(fight.duration or 0, 60)
            duration_str = f"{mins}:{secs:02d}" if fight.duration else ''

            data_rows.append([
                fight.fight_number or '',
                wc.name if wc else '',
                fight.round_name or '',
                f1_name,
                f2_name,
                winner_name,
                vt_name,
                fight.tp_one if fight.tp_one is not None else '',
                fight.tp_two if fight.tp_two is not None else '',
                fight.cp_one if fight.cp_one is not None else '',
                fight.cp_two if fight.cp_two is not None else '',
                duration_str,
            ])

        ExcelTableBuilder() \
            .with_headers([
                'Č. zápasu', 'Kategória', 'Kolo',
                'Zápasník 1', 'Zápasník 2', 'Víťaz',
                'Typ víťazstva', 'TP1', 'TP2', 'CP1', 'CP2', 'Čas'
            ]) \
            .with_data(data_rows) \
            .with_column_widths([10, 16, 14, 28, 28, 28, 20, 6, 6, 6, 6, 8]) \
            .build_to_sheet(ws)

    # ------------------------------------------------------------------
    # Sheet: Štatistiky
    # ------------------------------------------------------------------

    def _create_statistics_sheet(self) -> None:
        ws = self.workbook.create_sheet("Štatistiky")
        fights = self.metadata['fights']
        athlete_map = self.metadata['athlete_map']
        person_map = self.metadata['person_map']
        team_map = self.metadata['team_map']
        vt_map = self.metadata['vt_map']

        builder = ExcelSheetBuilder(ws)

        # Victory type distribution
        builder.add_title_row("TYPY VÍŤAZSTIEV", font_size=13, bold=True)
        builder.skip_rows(1)
        vt_counts = Counter(f.victory_type for f in fights if f.victory_type)
        builder.add_header_row(['Typ víťazstva', 'Kód', 'Počet', 'Podiel (%)'])
        total = len(fights) or 1
        for code, count in vt_counts.most_common():
            builder.add_data_row([
                vt_map.get(code, code),
                code,
                count,
                round(count / total * 100, 1),
            ])
        builder.set_column_widths([30, 10, 10, 14])
        builder.skip_rows(2)

        # Top performers
        builder.add_title_row("TOP PERFORMERI (podľa víťazstiev)", font_size=13, bold=True)
        builder.skip_rows(1)

        athlete_stats: dict = {}
        for fight in fights:
            for fid in set(filter(None, [fight.fighter_one_id, fight.fighter_two_id])):
                if fid not in athlete_stats:
                    athlete_stats[fid] = {'wins': 0, 'total': 0}
                athlete_stats[fid]['total'] += 1
            if fight.winner_id:
                if fight.winner_id not in athlete_stats:
                    athlete_stats[fight.winner_id] = {'wins': 0, 'total': 0}
                athlete_stats[fight.winner_id]['wins'] += 1

        builder.add_header_row(['#', 'Meno', 'Tím', 'Výhry', 'Zápasy', 'Úspešnosť (%)'])
        top = sorted(athlete_stats.items(), key=lambda x: (-x[1]['wins'], -x[1]['total']))[:20]
        for rank, (athlete_id, stats) in enumerate(top, 1):
            athlete = athlete_map.get(athlete_id)
            if not athlete:
                continue
            person = person_map.get(athlete.person_id) if athlete.person_id else None
            team = team_map.get(athlete.team_id) if athlete.team_id else None
            win_rate = round(stats['wins'] / stats['total'] * 100, 1) if stats['total'] else 0
            builder.add_data_row([
                rank,
                person.full_name if person else '',
                team.name if team else '',
                stats['wins'],
                stats['total'],
                win_rate,
            ])
        builder.skip_rows(2)

        # Team performance
        builder.add_title_row("VÝKONNOSŤ TÍMOV", font_size=13, bold=True)
        builder.skip_rows(1)

        team_stats: dict = {}
        for athlete_id, stats in athlete_stats.items():
            athlete = athlete_map.get(athlete_id)
            if not athlete or not athlete.team_id:
                continue
            tid = athlete.team_id
            if tid not in team_stats:
                team_stats[tid] = {'wins': 0, 'total': 0}
            team_stats[tid]['wins'] += stats['wins']
            team_stats[tid]['total'] += stats['total']

        builder.add_header_row(['#', 'Tím', 'Výhry', 'Prehry', 'Zápasy', 'Úspešnosť (%)'])
        team_rows = sorted(team_stats.items(), key=lambda x: (-x[1]['wins'], -x[1]['total']))
        for rank, (tid, ts) in enumerate(team_rows, 1):
            team = team_map.get(tid)
            win_rate = round(ts['wins'] / ts['total'] * 100, 1) if ts['total'] else 0
            builder.add_data_row([
                rank,
                team.name if team else '',
                ts['wins'],
                ts['total'] - ts['wins'],
                ts['total'],
                win_rate,
            ])

    def get_filename(self) -> str:
        return f"statistics-{self.sport_event_id}.xlsx"
