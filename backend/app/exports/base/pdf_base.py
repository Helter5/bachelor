"""Shared PDF export base class."""
from abc import ABC, abstractmethod
from io import BytesIO
from typing import List, Dict, Any
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Flowable

from ..utils.font_manager import font_manager


class BasePDFExport(ABC):
    """Base template for PDF exports.

    Subclasses load data in ``fetch_data`` and return ReportLab flowables from
    ``build_content``. ``generate`` owns the orchestration and buffer handling.
    """

    def __init__(
        self,
        pagesize=A4,
        top_margin: float = 0.5,
        bottom_margin: float = 0.5,
        left_margin: float = 0.75,
        right_margin: float = 0.75
    ):
        self.pagesize = pagesize
        self.top_margin = top_margin * inch
        self.bottom_margin = bottom_margin * inch
        self.left_margin = left_margin * inch
        self.right_margin = right_margin * inch

        font_manager._register_fonts()
        self.buffer = BytesIO()
        self.elements: List[Flowable] = []
        self.metadata: Dict[str, Any] = {}

    @abstractmethod
    def fetch_data(self) -> None:
        """Load export data into instance state."""
        pass

    @abstractmethod
    def build_content(self) -> List[Flowable]:
        """Return ReportLab elements for the PDF body."""
        pass

    def get_filename(self) -> str:
        """Return the default export filename."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"export_{timestamp}.pdf"

    def create_document(self) -> SimpleDocTemplate:
        """Create the ReportLab document with configured margins."""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=self.pagesize,
            topMargin=self.top_margin,
            bottomMargin=self.bottom_margin,
            leftMargin=self.left_margin,
            rightMargin=self.right_margin
        )
        doc.title = "Wrestling Federation Export"
        doc.author = "Wrestling Federation System"
        doc.subject = "Tournament Export"
        return doc

    def validate_data(self) -> None:
        """Override when an export needs validation before rendering."""
        pass

    def generate(self) -> BytesIO:
        """Generate the PDF and return a buffer positioned at the start."""
        self.fetch_data()
        self.validate_data()
        self.elements = self.build_content()
        doc = self.create_document()
        doc.build(self.elements)
        self.buffer.seek(0)
        return self.buffer

    def get_response_headers(self) -> Dict[str, str]:
        """Return headers for an inline PDF response."""
        return {
            "Content-Disposition": f"inline; filename={self.get_filename()}"
        }
