"""
Base class for Excel exports using Template Method pattern
"""
from abc import ABC, abstractmethod
from io import BytesIO
from typing import Dict, Any, List
from datetime import datetime

from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.utils import get_column_letter

from ..utils.formatters import formatter
from ..utils.styling import excel_style


class BaseExcelExport(ABC):
    """
    Abstract base class for Excel exports

    Uses Template Method pattern:
    - generate() defines the overall structure
    - Subclasses implement specific sheet creation methods
    """

    def __init__(self):
        """Initialize Excel export"""
        self.workbook: Workbook = Workbook()
        self.buffer = BytesIO()
        self.metadata: Dict[str, Any] = {}

    @abstractmethod
    def fetch_data(self) -> None:
        """
        Fetch required data from database/API

        Subclasses must implement this to load data into self.metadata
        """
        pass

    @abstractmethod
    def create_sheets(self) -> None:
        """
        Create Excel sheets with data

        Subclasses must implement this to populate workbook sheets
        """
        pass

    def get_filename(self) -> str:
        """
        Get export filename

        Returns:
            Filename for the export
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"export_{timestamp}.xlsx"

    def validate_data(self) -> None:
        """
        Validate fetched data

        Override in subclasses if validation is needed
        Raises exception if data is invalid
        """
        pass

    def apply_column_widths(self, sheet: Worksheet, widths: List[int]) -> None:
        """
        Apply column widths to sheet

        Args:
            sheet: Worksheet to modify
            widths: List of column widths
        """
        for idx, width in enumerate(widths, start=1):
            column_letter = get_column_letter(idx)
            sheet.column_dimensions[column_letter].width = width

    def style_header_row(
        self,
        sheet: Worksheet,
        row: int = 1,
        col_start: int = 1,
        col_end: int = None
    ) -> None:
        """
        Apply header styling to a row

        Args:
            sheet: Worksheet to modify
            row: Row number
            col_start: Start column
            col_end: End column (if None, uses max column)
        """
        if col_end is None:
            col_end = sheet.max_column

        header_fill = excel_style.create_header_fill()
        header_font = excel_style.create_header_font()
        cell_border = excel_style.create_cell_border()
        center_align = excel_style.create_center_alignment()

        for col in range(col_start, col_end + 1):
            cell = sheet.cell(row=row, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.border = cell_border
            cell.alignment = center_align

    def style_data_cells(
        self,
        sheet: Worksheet,
        row_start: int,
        row_end: int = None,
        col_start: int = 1,
        col_end: int = None
    ) -> None:
        """
        Apply borders to data cells

        Args:
            sheet: Worksheet to modify
            row_start: Start row
            row_end: End row (if None, uses max row)
            col_start: Start column
            col_end: End column (if None, uses max column)
        """
        if row_end is None:
            row_end = sheet.max_row
        if col_end is None:
            col_end = sheet.max_column

        cell_border = excel_style.create_cell_border()

        for row in range(row_start, row_end + 1):
            for col in range(col_start, col_end + 1):
                cell = sheet.cell(row=row, column=col)
                cell.border = cell_border

    def generate(self) -> BytesIO:
        """
        Template method for generating Excel

        This method defines the overall structure:
        1. Fetch data
        2. Validate data
        3. Create sheets
        4. Save workbook
        5. Return buffer

        Returns:
            BytesIO buffer with Excel content
        """
        # Step 1: Fetch data
        self.fetch_data()

        # Step 2: Validate data
        self.validate_data()

        # Step 3: Create sheets
        self.create_sheets()

        # Step 4: Save workbook
        self.workbook.save(self.buffer)
        self.buffer.seek(0)

        # Step 5: Return buffer
        return self.buffer

    def get_response_headers(self) -> Dict[str, str]:
        """
        Get HTTP response headers

        Returns:
            Dictionary of headers
        """
        return {
            "Content-Disposition": f"attachment; filename={self.get_filename()}"
        }
