"""
Builder classes for creating PDF elements
"""
from typing import List, Optional, Tuple, Union
from datetime import datetime

from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Table, TableStyle, Spacer, Image, Paragraph, HRFlowable
from reportlab.lib import colors

from ..utils.font_manager import font_manager
from ..utils.styling import ColorPalette, pdf_style
from ..utils.formatters import formatter


class PDFTableBuilder:
    """Builder for creating styled PDF tables"""

    def __init__(self, data: List[List[str]], col_widths: List[float] = None):
        """
        Initialize table builder

        Args:
            data: Table data as list of rows
            col_widths: Column widths in inches
        """
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
        """
        Add header styling to first row

        Args:
            bg_color: Background color
            text_color: Text color
            font_size: Font size

        Returns:
            Self for chaining
        """
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
        """
        Add body styling

        Args:
            font_size: Font size
            alternating_colors: Use alternating row colors

        Returns:
            Self for chaining
        """
        body_styles = pdf_style.create_body_style(
            font_size=font_size,
            alternating_colors=alternating_colors
        )
        self.style_commands.extend(body_styles)
        return self

    def with_grid(self, line_width: float = 0.5, color=None) -> 'PDFTableBuilder':
        """
        Add grid lines

        Args:
            line_width: Line width
            color: Grid color

        Returns:
            Self for chaining
        """
        grid_styles = pdf_style.create_grid_style(line_width=line_width, color=color)
        self.style_commands.extend(grid_styles)
        return self

    def with_medal_highlights(self) -> 'PDFTableBuilder':
        """
        Add medal podium highlighting (gold, silver, bronze)

        Returns:
            Self for chaining
        """
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
        """
        Add custom style command

        Args:
            style_command: Style command tuple

        Returns:
            Self for chaining
        """
        self.style_commands.append(style_command)
        return self

    def with_column_alignment(
        self,
        col: int,
        alignment: str,
        row_start: int = 1,
        row_end: int = -1
    ) -> 'PDFTableBuilder':
        """
        Set alignment for specific column

        Args:
            col: Column index
            alignment: Alignment ('LEFT', 'CENTER', 'RIGHT')
            row_start: Start row
            row_end: End row

        Returns:
            Self for chaining
        """
        self.style_commands.append(
            ('ALIGN', (col, row_start), (col, row_end), alignment)
        )
        return self

    def build(self) -> Table:
        """
        Build the table

        Returns:
            Configured Table object
        """
        table = Table(self.data, colWidths=self.col_widths, repeatRows=self.repeat_rows)
        table.setStyle(TableStyle(self.style_commands))
        return table


class PDFTitleBuilder:
    """Builder for creating styled title elements"""

    def __init__(self, text: str, width: float = 6.5):
        """
        Initialize title builder

        Args:
            text: Title text
            width: Width in inches
        """
        self.text = text
        self.width = width * inch
        self.style_commands = []
        self.font_size = 16
        self.bold = True
        self.alignment = 'CENTER'
        self.text_color = None

    def with_size(self, font_size: int) -> 'PDFTitleBuilder':
        """Set font size"""
        self.font_size = font_size
        return self

    def with_alignment(self, alignment: str) -> 'PDFTitleBuilder':
        """Set alignment"""
        self.alignment = alignment
        return self

    def with_color(self, color) -> 'PDFTitleBuilder':
        """Set text color"""
        self.text_color = color
        return self

    def bold(self, is_bold: bool = True) -> 'PDFTitleBuilder':
        """Set bold"""
        self.bold = is_bold
        return self

    def build(self) -> Table:
        """Build the title as a table"""
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
    """Builder for creating footer elements"""

    def __init__(self, width: float = 6.5):
        """
        Initialize footer builder

        Args:
            width: Width in inches
        """
        self.width = width * inch
        self.timestamp = datetime.now()
        self.text_template = "Vygenerované: {timestamp}"
        self.font_size = 8

    def with_template(self, template: str) -> 'PDFFooterBuilder':
        """Set text template"""
        self.text_template = template
        return self

    def with_timestamp(self, timestamp: datetime) -> 'PDFFooterBuilder':
        """Set timestamp"""
        self.timestamp = timestamp
        return self

    def build(self) -> Table:
        """Build the footer"""
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
    """Builder for creating spacers"""

    @staticmethod
    def create(height: float = 0.2) -> Spacer:
        """
        Create a spacer

        Args:
            height: Height in inches

        Returns:
            Spacer object
        """
        return Spacer(1, height * inch)


class PDFStatisticsBoxBuilder:
    """Builder for creating statistics display boxes"""

    def __init__(self, width: float = 6.5):
        """
        Initialize statistics box builder

        Args:
            width: Total width in inches
        """
        self.width = width * inch
        self.stats: List[Tuple[str, str]] = []  # (number, label) pairs

    def add_stat(self, number: Union[int, str], label: str) -> 'PDFStatisticsBoxBuilder':
        """
        Add a statistic

        Args:
            number: Statistic number
            label: Statistic label

        Returns:
            Self for chaining
        """
        self.stats.append((str(number), label))
        return self

    def build(self) -> Table:
        """Build the statistics box"""
        if not self.stats:
            return None

        num_stats = len(self.stats)
        col_width = self.width / num_stats

        # Create data rows
        numbers = [stat[0] for stat in self.stats]
        labels = [stat[1] for stat in self.stats]

        table = Table([numbers, labels], colWidths=[col_width] * num_stats)
        table.setStyle(TableStyle([
            # Numbers row
            ('FONTNAME', (0, 0), (-1, 0), font_manager.bold_font),
            ('FONTSIZE', (0, 0), (-1, 0), 24),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorPalette.DARK_GRAY),
            ('TOPPADDING', (0, 0), (-1, 0), 15),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),

            # Labels row
            ('FONTNAME', (0, 1), (-1, 1), font_manager.default_font),
            ('FONTSIZE', (0, 1), (-1, 1), 10),
            ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
            ('TEXTCOLOR', (0, 1), (-1, 1), ColorPalette.MEDIUM_GRAY),
            ('TOPPADDING', (0, 1), (-1, 1), 10),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 10),

            # Border
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
