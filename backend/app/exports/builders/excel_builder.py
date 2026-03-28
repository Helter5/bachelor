"""
Builder classes for creating Excel elements
"""
from typing import List, Optional, Any
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from ..utils.styling import excel_style


class ExcelSheetBuilder:
    """Builder for creating and populating Excel sheets"""

    def __init__(self, sheet: Worksheet):
        """
        Initialize sheet builder

        Args:
            sheet: Worksheet to build
        """
        self.sheet = sheet
        self.current_row = 1
        # Cache styles to avoid recreating them
        self._header_fill = excel_style.create_header_fill()
        self._header_font = excel_style.create_header_font()
        self._cell_border = excel_style.create_cell_border()
        self._center_align = excel_style.create_center_alignment()

    def add_header_row(
        self,
        headers: List[str],
        row: Optional[int] = None
    ) -> 'ExcelSheetBuilder':
        """
        Add header row with styling

        Args:
            headers: List of header texts
            row: Row number (if None, uses current_row)

        Returns:
            Self for chaining
        """
        row = row or self.current_row

        for col_num, header in enumerate(headers, 1):
            cell = self.sheet.cell(row=row, column=col_num, value=header)
            cell.fill = self._header_fill
            cell.font = self._header_font
            cell.border = self._cell_border
            cell.alignment = self._center_align

        self.current_row = row + 1
        return self

    def add_data_row(
        self,
        data: List[Any],
        row: Optional[int] = None
    ) -> 'ExcelSheetBuilder':
        """
        Add data row

        Args:
            data: List of cell values
            row: Row number (if None, uses current_row)

        Returns:
            Self for chaining
        """
        row = row or self.current_row

        for col_num, value in enumerate(data, 1):
            cell = self.sheet.cell(row=row, column=col_num, value=value)
            cell.border = self._cell_border

        self.current_row = row + 1
        return self

    def add_data_rows(
        self,
        data_rows: List[List[Any]]
    ) -> 'ExcelSheetBuilder':
        """
        Add multiple data rows

        Args:
            data_rows: List of row data

        Returns:
            Self for chaining
        """
        for row_data in data_rows:
            self.add_data_row(row_data)
        return self

    def add_title_row(
        self,
        title: str,
        font_size: int = 16,
        bold: bool = True
    ) -> 'ExcelSheetBuilder':
        """
        Add title row

        Args:
            title: Title text
            font_size: Font size
            bold: Use bold font

        Returns:
            Self for chaining
        """
        cell = self.sheet.cell(row=self.current_row, column=1, value=title)
        cell.font = Font(bold=bold, size=font_size)

        self.current_row += 1
        return self

    def add_label_value_row(
        self,
        label: str,
        value: Any,
        label_bold: bool = True
    ) -> 'ExcelSheetBuilder':
        """
        Add label-value pair row

        Args:
            label: Label text
            value: Value
            label_bold: Make label bold

        Returns:
            Self for chaining
        """
        label_cell = self.sheet.cell(row=self.current_row, column=1, value=label)
        if label_bold:
            label_cell.font = Font(bold=True)

        self.sheet.cell(row=self.current_row, column=2, value=value)

        self.current_row += 1
        return self

    def skip_rows(self, count: int = 1) -> 'ExcelSheetBuilder':
        """
        Skip rows

        Args:
            count: Number of rows to skip

        Returns:
            Self for chaining
        """
        self.current_row += count
        return self

    def merge_cells(
        self,
        start_row: int,
        start_col: int,
        end_row: int,
        end_col: int
    ) -> 'ExcelSheetBuilder':
        """
        Merge cells

        Args:
            start_row: Start row
            start_col: Start column
            end_row: End row
            end_col: End column

        Returns:
            Self for chaining
        """
        start_cell = self.sheet.cell(row=start_row, column=start_col)
        end_cell = self.sheet.cell(row=end_row, column=end_col)

        self.sheet.merge_cells(
            f"{start_cell.coordinate}:{end_cell.coordinate}"
        )
        return self

    def set_column_widths(self, widths: List[int]) -> 'ExcelSheetBuilder':
        """
        Set column widths

        Args:
            widths: List of column widths

        Returns:
            Self for chaining
        """
        for idx, width in enumerate(widths, start=1):
            column_letter = get_column_letter(idx)
            self.sheet.column_dimensions[column_letter].width = width
        return self

    def build(self) -> Worksheet:
        """
        Build and return the sheet

        Returns:
            Configured worksheet
        """
        return self.sheet


class ExcelTableBuilder:
    """Builder for creating Excel tables with data"""

    def __init__(self):
        """Initialize table builder"""
        self.headers: List[str] = []
        self.data_rows: List[List[Any]] = []
        self.column_widths: List[int] = []

    def with_headers(self, headers: List[str]) -> 'ExcelTableBuilder':
        """
        Set table headers

        Args:
            headers: List of header texts

        Returns:
            Self for chaining
        """
        self.headers = headers
        return self

    def with_data(self, data_rows: List[List[Any]]) -> 'ExcelTableBuilder':
        """
        Set table data

        Args:
            data_rows: List of row data

        Returns:
            Self for chaining
        """
        self.data_rows = data_rows
        return self

    def with_column_widths(self, widths: List[int]) -> 'ExcelTableBuilder':
        """
        Set column widths

        Args:
            widths: List of column widths

        Returns:
            Self for chaining
        """
        self.column_widths = widths
        return self

    def build_to_sheet(
        self,
        sheet: Worksheet,
        start_row: int = 1
    ) -> Worksheet:
        """
        Build table to worksheet

        Args:
            sheet: Worksheet to build to
            start_row: Starting row number

        Returns:
            Worksheet with table
        """
        builder = ExcelSheetBuilder(sheet)
        builder.current_row = start_row

        # Add headers
        if self.headers:
            builder.add_header_row(self.headers)

        # Add data rows
        builder.add_data_rows(self.data_rows)

        # Set column widths
        if self.column_widths:
            builder.set_column_widths(self.column_widths)

        return builder.build()
