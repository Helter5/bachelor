"""Filesystem path constants anchored to the repo root.

All paths are resolved at import time so they are CWD-independent
regardless of where the process was launched from.
"""
import os

# backend/ directory (two levels up from app/core/)
_BACKEND_DIR = os.path.realpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
)

UPLOADS_ROOT = os.path.join(_BACKEND_DIR, "uploads")
AVATARS_DIR = os.path.join(UPLOADS_ROOT, "avatars")
