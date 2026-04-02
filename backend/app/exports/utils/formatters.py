"""
Data formatting utilities for exports
"""
from datetime import datetime, date
from typing import Optional, Union


class DateFormatter:
    """Handles date formatting for exports"""

    @staticmethod
    def format_date(date_input: Optional[Union[str, datetime]], format_string: str = "%d.%m.%Y") -> str:
        """
        Format date to Slovak format

        Args:
            date_input: Date string or datetime object
            format_string: Output format string

        Returns:
            Formatted date string or 'N/A' if invalid
        """
        if not date_input:
            return "N/A"

        try:
            if isinstance(date_input, str):
                dt = datetime.fromisoformat(date_input.replace('Z', '+00:00'))
            elif isinstance(date_input, datetime):
                dt = date_input
            elif isinstance(date_input, date):
                dt = datetime(date_input.year, date_input.month, date_input.day)
            else:
                return "N/A"

            return dt.strftime(format_string)
        except Exception:
            return str(date_input) if date_input else "N/A"

    @staticmethod
    def format_datetime(date_input: Optional[Union[str, datetime]]) -> str:
        """
        Format datetime to Slovak format with time

        Args:
            date_input: Date string or datetime object

        Returns:
            Formatted datetime string
        """
        return DateFormatter.format_date(date_input, "%d.%m.%Y %H:%M")


class TextFormatter:
    """Handles text formatting for exports"""

    @staticmethod
    def clean_locality(locality: Optional[str]) -> str:
        """
        Clean locality by removing country code suffix

        Args:
            locality: Locality string (e.g., "Manama - BH")

        Returns:
            Cleaned locality (e.g., "Manama")
        """
        if not locality or locality == 'N/A':
            return 'N/A'

        if ' - ' in locality:
            return locality.split(' - ')[0].strip()

        return locality

    @staticmethod
    def safe_value(value: Optional[any], default: str = 'N/A') -> str:
        """
        Get safe string value or default

        Args:
            value: Any value
            default: Default value if input is None

        Returns:
            String value or default
        """
        return str(value) if value is not None else default

    @staticmethod
    def format_boolean(value: bool, true_text: str = "Áno", false_text: str = "Nie") -> str:
        """
        Format boolean to Slovak text

        Args:
            value: Boolean value
            true_text: Text for True
            false_text: Text for False

        Returns:
            Formatted boolean text
        """
        return true_text if value else false_text


class NumberFormatter:
    """Handles number formatting for exports"""

    @staticmethod
    def format_count(count: Optional[int]) -> str:
        """
        Format count with zero handling

        Args:
            count: Count value

        Returns:
            Formatted count string
        """
        return str(count) if count is not None else "0"

    @staticmethod
    def format_rank(rank: Optional[int]) -> str:
        """
        Format rank position

        Args:
            rank: Rank position

        Returns:
            Formatted rank or empty string
        """
        return str(rank) if rank else ""


class DataFormatter:
    """Main formatter class combining all formatters"""

    def __init__(self):
        self.date = DateFormatter()
        self.text = TextFormatter()
        self.number = NumberFormatter()


# Global formatter instance
formatter = DataFormatter()
