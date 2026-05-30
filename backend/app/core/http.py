"""Shared HTTP client accessor.

In a normal FastAPI process the application's ``lifespan`` (main.py) installs
a single long-lived ``httpx.AsyncClient`` via :func:`set_http_client` and
every outbound call (Arena API, OAuth verification) reuses that pool.

Scripts and tests run helpers without going through the lifespan. In that
case the cached singleton would outlive its event loop (pytest-asyncio
creates a fresh loop per test) and the next call would raise
``RuntimeError: Event loop is closed``. To avoid that, callers should
acquire the client through :func:`http_client_ctx`: when no lifespan-owned
client is registered, the context manager yields a fresh disposable client
and closes it on exit; when one is registered, the same shared instance is
returned without being closed.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx


_client: httpx.AsyncClient | None = None


def set_http_client(client: httpx.AsyncClient | None) -> None:
    """Install (or clear) the process-wide HTTP client. Called by the
    FastAPI lifespan; tests should leave it untouched."""
    global _client
    _client = client


@asynccontextmanager
async def http_client_ctx() -> AsyncIterator[httpx.AsyncClient]:
    """Yield an ``httpx.AsyncClient`` safe to use from the current event loop.

    - If lifespan registered one, yield it without closing.
    - Otherwise (scripts, tests with their own loop per test), open a fresh
      client and close it when the block exits.
    """
    if _client is not None:
        yield _client
        return
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client


def get_http_client() -> httpx.AsyncClient:
    """Return the lifespan-owned HTTP client.

    Kept for callers that need a bare reference (no context manager) and
    can guarantee the lifespan is active. New code should prefer
    :func:`http_client_ctx` which is safe to call from any context.
    """
    if _client is None:
        raise RuntimeError(
            "HTTP client not initialized. Use http_client_ctx() instead, "
            "or ensure the FastAPI app's lifespan has started."
        )
    return _client
