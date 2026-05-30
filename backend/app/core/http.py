"""Shared HTTP client accessor.

A single ``httpx.AsyncClient`` is created in ``app.lifespan`` (``main.py``) and
reused for every outbound request (Arena API, OAuth verification, etc.).
Reusing the client keeps the connection pool warm and avoids a TLS handshake
per call.

Services and helpers that need an outbound client call ``get_http_client()``
rather than constructing their own — that ensures the same pool is shared and
prevents the per-request ``async with httpx.AsyncClient()`` anti-pattern.

Tests can swap the client by calling ``set_http_client(mock)``.
"""
from __future__ import annotations

import httpx


_client: httpx.AsyncClient | None = None


def set_http_client(client: httpx.AsyncClient | None) -> None:
    """Install (or clear) the process-wide HTTP client."""
    global _client
    _client = client


def get_http_client() -> httpx.AsyncClient:
    """Return the shared HTTP client.

    The FastAPI lifespan in ``main.py`` installs the client at startup.
    For scripts and tests that import helpers without going through the
    lifespan (seed scripts, ad-hoc fixtures), a lazily-created client is
    cached on first access so callers do not have to plumb it through.
    """
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client
