"""
Base class for PDF exports using Template Method pattern
"""
from abc import ABC, abstractmethod
from io import BytesIO
from typing import List, Optional, Dict, Any
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Flowable

from ..utils.font_manager import font_manager
from ..utils.formatters import formatter


class BasePDFExport(ABC):
    """
    Abstract base class for PDF exports

    Uses Template Method pattern:
    - generate() defines the overall structure
    - Subclasses implement specific content generation methods
    """

    def __init__(
        self,
        pagesize=A4,
        top_margin: float = 0.5,
        bottom_margin: float = 0.5,
        left_margin: float = 0.75,
        right_margin: float = 0.75
    ):
        """
        Initialize PDF export

        Args:
            pagesize: Page size (default A4)
            top_margin: Top margin in inches
            bottom_margin: Bottom margin in inches
            left_margin: Left margin in inches
            right_margin: Right margin in inches
        """
        self.pagesize = pagesize
        self.top_margin = top_margin * inch
        self.bottom_margin = bottom_margin * inch
        self.left_margin = left_margin * inch
        self.right_margin = right_margin * inch

        # Ensure fonts are registered
        font_manager._register_fonts()

        # Buffer for PDF content
        self.buffer = BytesIO()

        # Document elements
        self.elements: List[Flowable] = []

        # Metadata
        self.metadata: Dict[str, Any] = {}

    @abstractmethod
    def fetch_data(self) -> None:
        """
        Fetch required data from database/API

        Subclasses must implement this to load data into self.metadata
        """
        pass

    @abstractmethod
    def build_content(self) -> List[Flowable]:
        """
        Build PDF content elements

        Subclasses must implement this to create document elements

        Returns:
            List of reportlab Flowable elements
        """
        pass

    def get_filename(self) -> str:
        """
        Get export filename

        Returns:
            Filename for the export
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"export_{timestamp}.pdf"

    def create_document(self) -> SimpleDocTemplate:
        """
        Create PDF document with configured margins

        Returns:
            SimpleDocTemplate instance
        """
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=self.pagesize,
            topMargin=self.top_margin,
            bottomMargin=self.bottom_margin,
            leftMargin=self.left_margin,
            rightMargin=self.right_margin
        )
        # Set document metadata for UTF-8 encoding
        doc.title = "Wrestling Federation Export"
        doc.author = "Wrestling Federation System"
        doc.subject = "Tournament Export"
        return doc

    def validate_data(self) -> None:
        """
        Validate fetched data

        Override in subclasses if validation is needed
        Raises exception if data is invalid
        """
        pass

    def generate(self) -> BytesIO:
        """
        Template method for generating PDF

        This method defines the overall structure:
        1. Fetch data
        2. Validate data
        3. Build content
        4. Create document
        5. Build PDF
        6. Return buffer

        Returns:
            BytesIO buffer with PDF content
        """
        # Step 1: Fetch data
        self.fetch_data()

        # Step 2: Validate data
        self.validate_data()

        # Step 3: Build content elements
        self.elements = self.build_content()

        # Step 4: Create document
        doc = self.create_document()

        # Step 5: Build PDF
        doc.build(self.elements)

        # Step 6: Return buffer
        self.buffer.seek(0)
        return self.buffer

    def get_response_headers(self) -> Dict[str, str]:
        """
        Get HTTP response headers

        Returns:
            Dictionary of headers
        """
        return {
            "Content-Disposition": f"inline; filename={self.get_filename()}"
        }
