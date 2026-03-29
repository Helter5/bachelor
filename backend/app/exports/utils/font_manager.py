"""
Font management utility for PDF exports
"""
import os
import sys
import logging
from typing import Optional
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

logger = logging.getLogger(__name__)


class FontManager:
    """Manages font registration and provides font access"""

    _instance: Optional['FontManager'] = None
    _fonts_registered: bool = False

    FONT_DEJAVU_SANS = 'DejaVuSans'
    FONT_DEJAVU_SANS_BOLD = 'DejaVuSans-Bold'

    def __new__(cls):
        """Singleton pattern to ensure fonts are registered only once"""
        if cls._instance is None:
            cls._instance = super(FontManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize font manager"""
        if not self._fonts_registered:
            self._register_fonts()

    def _find_font_paths(self) -> tuple:
        """Find DejaVu font paths based on OS"""
        # Try multiple common locations
        possible_paths = [
            # Linux
            ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
             '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
            # macOS with Homebrew
            ('/opt/homebrew/share/fonts/dejavu-fonts-ttf-2.37/ttf/DejaVuSans.ttf',
             '/opt/homebrew/share/fonts/dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf'),
            # macOS with conda/pip package (use bundled fonts)
            (os.path.join(sys.prefix, 'lib/python*/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans.ttf'),
             os.path.join(sys.prefix, 'lib/python*/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans-Bold.ttf')),
        ]
        
        # Check environment variables first
        env_normal = os.environ.get('DEJAVU_SANS_PATH')
        env_bold = os.environ.get('DEJAVU_SANS_BOLD_PATH')
        if env_normal and env_bold and os.path.exists(env_normal) and os.path.exists(env_bold):
            return env_normal, env_bold
        
        # Try each possible path
        for normal_path, bold_path in possible_paths:
            if os.path.exists(normal_path) and os.path.exists(bold_path):
                return normal_path, bold_path
        
        # Try using matplotlib's bundled fonts (usually available with conda)
        try:
            import matplotlib
            mpl_data = matplotlib.get_data_path()
            normal_path = os.path.join(mpl_data, 'fonts/ttf/DejaVuSans.ttf')
            bold_path = os.path.join(mpl_data, 'fonts/ttf/DejaVuSans-Bold.ttf')
            if os.path.exists(normal_path) and os.path.exists(bold_path):
                return normal_path, bold_path
        except ImportError:
            pass
        
        return None, None

    def _register_fonts(self) -> None:
        """Register UTF-8 fonts for PDF generation"""
        try:
            normal_path, bold_path = self._find_font_paths()
            
            if normal_path and bold_path:
                pdfmetrics.registerFont(TTFont(self.FONT_DEJAVU_SANS, normal_path))
                pdfmetrics.registerFont(TTFont(self.FONT_DEJAVU_SANS_BOLD, bold_path))
                
                # Add font family mapping
                addMapping(self.FONT_DEJAVU_SANS, 0, 0, self.FONT_DEJAVU_SANS)
                addMapping(self.FONT_DEJAVU_SANS, 1, 0, self.FONT_DEJAVU_SANS_BOLD)
                
                logger.info(f"Successfully registered DejaVu fonts from: {normal_path}")
                FontManager._fonts_registered = True
            else:
                logger.warning("DejaVu fonts not found. Using Helvetica (limited UTF-8 support). "
                               "To fix: install DejaVu fonts or set DEJAVU_SANS_PATH and DEJAVU_SANS_BOLD_PATH env vars.")
                # Use Helvetica as fallback (has limited UTF-8 support)
                self.FONT_DEJAVU_SANS = 'Helvetica'
                self.FONT_DEJAVU_SANS_BOLD = 'Helvetica-Bold'
                FontManager._fonts_registered = True
        except Exception as e:
            # Fallback to default fonts if custom fonts are not available
            logger.warning(f"Could not register custom fonts: {e}")
            self.FONT_DEJAVU_SANS = 'Helvetica'
            self.FONT_DEJAVU_SANS_BOLD = 'Helvetica-Bold'
            FontManager._fonts_registered = True

    @property
    def default_font(self) -> str:
        """Get default font name"""
        return self.FONT_DEJAVU_SANS

    @property
    def bold_font(self) -> str:
        """Get bold font name"""
        return self.FONT_DEJAVU_SANS_BOLD

    def get_font(self, bold: bool = False) -> str:
        """
        Get font name

        Args:
            bold: Whether to get bold font

        Returns:
            Font name
        """
        return self.bold_font if bold else self.default_font


# Global singleton instance
font_manager = FontManager()
