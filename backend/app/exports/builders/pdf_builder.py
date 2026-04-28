"""Fluent helpers for building ReportLab PDF elements."""
from typing import List, Optional, Tuple, Union
from datetime import datetime
from zoneinfo import ZoneInfo

from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Table, TableStyle, Spacer, Image, Paragraph, HRFlowable
from reportlab.lib import colors

from ..utils.font_manager import font_manager
from ..utils.styling import ColorPalette, pdf_style
from ..utils.formatters import formatter


class PDFTableBuilder:
    """Small fluent wrapper around ReportLab tables."""

    def __init__(self, data: List[List[str]], col_widths: List[float] = None):
        self.data = data
        self.col_widths = [w * inch for w in col_widths] if col_widths else None
        self.style_commands = []
        self.repeat_rows = 0

    def with_header(
        self,
        bg_color=None,
        text_color=None,
        font_size: int = 10
    ) -> 'PDFTableBuilder':
        header_styles = pdf_style.create_header_style(
            bg_color=bg_color,
            text_color=text_color,
            font_size=font_size
        )
        self.style_commands.extend(header_styles)
        self.repeat_rows = 1
        return self

    def with_body(
        self,
        font_size: int = 9,
        alternating_colors: bool = True
    ) -> 'PDFTableBuilder':
        body_styles = pdf_style.create_body_style(
            font_size=font_size,
            alternating_colors=alternating_colors
        )
        self.style_commands.extend(body_styles)
        return self

    def with_grid(self, line_width: float = 0.5, color=None) -> 'PDFTableBuilder':
        grid_styles = pdf_style.create_grid_style(line_width=line_width, color=color)
        self.style_commands.extend(grid_styles)
        return self

    def with_medal_highlights(self) -> 'PDFTableBuilder':
        if len(self.data) > 1:
            self.style_commands.append(
                ('BACKGROUND', (0, 1), (-1, 1), ColorPalette.GOLD)
            )
        if len(self.data) > 2:
            self.style_commands.append(
                ('BACKGROUND', (0, 2), (-1, 2), ColorPalette.SILVER)
            )
        if len(self.data) > 3:
            self.style_commands.append(
                ('BACKGROUND', (0, 3), (-1, 3), ColorPalette.BRONZE)
            )
        return self

    def with_custom_style(self, style_command: Tuple) -> 'PDFTableBuilder':
        self.style_commands.append(style_command)
        return self

    def with_column_alignment(
        self,
        col: int,
        alignment: str,
        row_start: int = 1,
        row_end: int = -1
    ) -> 'PDFTableBuilder':
        self.style_commands.append(
            ('ALIGN', (col, row_start), (col, row_end), alignment)
        )
        return self

    def build(self) -> Table:
        table = Table(self.data, colWidths=self.col_widths, repeatRows=self.repeat_rows)
        table.setStyle(TableStyle(self.style_commands))
        return table


class PDFTitleBuilder:
    """Build a title element as a one-cell table."""

    def __init__(self, text: str, width: float = 6.5):
        self.text = text
        self.width = width * inch
        self.style_commands = []
        self.font_size = 16
        self.bold = True
        self.alignment = 'CENTER'
        self.text_color = None

    def with_size(self, font_size: int) -> 'PDFTitleBuilder':
        self.font_size = font_size
        return self

    def with_alignment(self, alignment: str) -> 'PDFTitleBuilder':
        self.alignment = alignment
        return self

    def with_color(self, color) -> 'PDFTitleBuilder':
        self.text_color = color
        return self

    def bold(self, is_bold: bool = True) -> 'PDFTitleBuilder':
        self.bold = is_bold
        return self

    def build(self) -> Table:
        table = Table([[self.text]], colWidths=[self.width])

        styles = [
            ('ALIGN', (0, 0), (0, 0), self.alignment),
            ('FONTNAME', (0, 0), (0, 0),
             font_manager.bold_font if self.bold else font_manager.default_font),
            ('FONTSIZE', (0, 0), (0, 0), self.font_size),
            ('TOPPADDING', (0, 0), (0, 0), 6),
            ('BOTTOMPADDING', (0, 0), (0, 0), 6),
        ]

        if self.text_color:
            styles.append(('TEXTCOLOR', (0, 0), (0, 0), self.text_color))

        table.setStyle(TableStyle(styles))
        return table


class PDFFooterBuilder:
    """Build a timestamp footer element."""

    def __init__(self, width: float = 6.5):
        self.width = width * inch
        self.timestamp = datetime.now(ZoneInfo("Europe/Berlin"))
        self.text_template = "Vygenerované: {timestamp}"
        self.font_size = 8

    def with_template(self, template: str) -> 'PDFFooterBuilder':
        self.text_template = template
        return self

    def with_timestamp(self, timestamp: datetime) -> 'PDFFooterBuilder':
        self.timestamp = timestamp
        return self

    def build(self) -> Table:
        text = self.text_template.format(
            timestamp=formatter.date.format_datetime(self.timestamp)
        )

        table = Table([[text]], colWidths=[self.width])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), font_manager.default_font),
            ('FONTSIZE', (0, 0), (0, 0), self.font_size),
            ('TEXTCOLOR', (0, 0), (0, 0), ColorPalette.GREY),
        ]))
        return table


class PDFSpacerBuilder:
    @staticmethod
    def create(height: float = 0.2) -> Spacer:
        return Spacer(1, height * inch)


class PDFStatisticsBoxBuilder:
    """Build a compact two-row statistics summary table."""

    def __init__(self, width: float = 6.5):
        self.width = width * inch
        self.stats: List[Tuple[str, str]] = []  # (number, label) pairs

    def add_stat(self, number: Union[int, str], label: str) -> 'PDFStatisticsBoxBuilder':
        self.stats.append((str(number), label))
        return self

    def build(self) -> Table:
        if not self.stats:
            return None

        num_stats = len(self.stats)
        col_width = self.width / num_stats

        numbers = [stat[0] for stat in self.stats]
        labels = [stat[1] for stat in self.stats]

        table = Table([numbers, labels], colWidths=[col_width] * num_stats)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), font_manager.bold_font),
            ('FONTSIZE', (0, 0), (-1, 0), 24),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorPalette.DARK_GRAY),
            ('TOPPADDING', (0, 0), (-1, 0), 15),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),

            ('FONTNAME', (0, 1), (-1, 1), font_manager.default_font),
            ('FONTSIZE', (0, 1), (-1, 1), 10),
            ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
            ('TEXTCOLOR', (0, 1), (-1, 1), ColorPalette.MEDIUM_GRAY),
            ('TOPPADDING', (0, 1), (-1, 1), 10),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 10),

            ('BOX', (0, 0), (-1, -1), 0.5, ColorPalette.GREY),
        ]))

        return table


def build_export_header(event_name: str, subtitle: str) -> List:
    """
    Build a standard page header used across all PDF exports.

    Returns a list of flowables: large event name, grey subtitle,
    blue accent line, and a small spacer — ready to extend into elements.
    """
    title_style = ParagraphStyle(
        "ExportHeaderTitle",
        fontName=font_manager.bold_font,
        fontSize=18,
        leading=22,
        textColor=ColorPalette.DARK_GRAY,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ExportHeaderSubtitle",
        fontName=font_manager.default_font,
        fontSize=11,
        leading=14,
        textColor=ColorPalette.MEDIUM_GRAY,
        spaceAfter=6,
    )
    return [
        Paragraph(event_name, title_style),
        Paragraph(subtitle, subtitle_style),
        HRFlowable(width="100%", thickness=2, color=ColorPalette.PRIMARY_BLUE, spaceAfter=10),
        PDFSpacerBuilder.create(0.15),
    ]
