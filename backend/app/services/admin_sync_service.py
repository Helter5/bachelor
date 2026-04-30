"""Support services for admin sync orchestration and guard logic."""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, col, select

from ..config import get_settings
from ..domain.entities.arena_source import ArenaSource
from ..domain.entities.sport_event import SportEvent
from ..domain.entities.sync_log import SyncLog
from ..domain.entities.user import User
from ..infrastructure.arena_gateway import ArenaGateway

_settings = get_settings()

# These caches/locks intentionally remain process-local for single-container dev deployments.
_sync_locks: dict[str, asyncio.Lock] = {}
_sync_results: dict[str, dict[str, Any]] = {}


class AdminSyncService:
    """Encapsulates admin sync run guards, lock access, and sync-log lifecycle."""

    def __init__(self, session: Session):
        self.session = session

    def cleanup_old_sync_logs(self) -> None:
        """Keep only the most recent sync logs, delete the rest."""
        keep_ids_stmt = (
            select(SyncLog.id)
            .order_by(col(SyncLog.started_at).desc())
            .limit(_settings.sync_log_max_entries)
        )
        keep_ids = [row for row in self.session.exec(keep_ids_stmt).all()]

        if not keep_ids:
            return

        old_logs_stmt = select(SyncLog).where(SyncLog.id.notin_(keep_ids))
        old_logs = self.session.exec(old_logs_stmt).all()
        for log in old_logs:
            self.session.delete(log)
        if old_logs:
            self.session.commit()

    @staticmethod
    def as_utc_datetime(value: datetime) -> datetime:
        """Normalize DB datetimes so comparisons work across naive/aware values."""
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def is_sync_log_effectively_active(self, sync_log: SyncLog) -> bool:
        """Treat obviously stale/completed in-progress logs as inactive."""
        if sync_log.status != "in_progress":
            return False

        details = sync_log.details or {}
        progress = int(details.get("progress_percent") or 0)
        step = str(details.get("current_step") or "").strip().lower()

        if progress >= 100 or step in {"completed", "failed"}:
            return False

        started_at = self.as_utc_datetime(sync_log.started_at)
        if started_at < datetime.now(timezone.utc) - timedelta(hours=12):
            return False

        return True

    def get_active_sync_log(self) -> Optional[SyncLog]:
        """Return the most recent effectively-active global sync log, if any."""
        logs = self.session.exec(
            select(SyncLog)
            .where(SyncLog.status == "in_progress")
            .order_by(col(SyncLog.started_at).desc())
            .limit(10)
        ).all()

        for log in logs:
            if self.is_sync_log_effectively_active(log):
                return log

        return None

    def ensure_sync_run_access(
        self,
        sync_log_id: Optional[int],
        *,
        allow_start_new: bool,
    ) -> Optional[SyncLog]:
        """
        Enforce a single global sync run.

        If an active sync exists, only requests carrying the same sync_log_id may continue it.
        """
        active_log = self.get_active_sync_log()
        if not active_log:
            return None if allow_start_new else None

        if sync_log_id is not None and active_log.id == sync_log_id:
            return active_log

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Synchronizácia už prebieha (sync log #{active_log.id}). "
                "Počkajte na jej dokončenie."
            ),
        )

    def get_active_arena_source(self, user_id: int) -> ArenaSource:
        """Return the single active ArenaSource for the given user."""
        source = self.session.exec(
            select(ArenaSource).where(
                ArenaSource.is_enabled.is_(True),
                ArenaSource.user_id == user_id,
            ).order_by(ArenaSource.id)
        ).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nemáte nakonfigurovanú Arena inštanciu. Pridajte ju v Nastaveniach → Arena Zdroje.",
            )
        return source

    async def resolve_event_uuid_for_source(
        self,
        event: SportEvent,
        source: ArenaSource,
    ) -> Optional[str]:
        """Return the Arena UUID for the given event in the source, or None if not found."""
        return await ArenaGateway(source).resolve_event_uuid_for_source(event, source=source)

    @staticmethod
    def get_cached_result(idempotency_key: str) -> Optional[dict[str, Any]]:
        """Return cached idempotent result when available."""
        return _sync_results.get(idempotency_key)

    @staticmethod
    def cache_result(idempotency_key: str, result: dict[str, Any]) -> None:
        """Store result for idempotent retries."""
        _sync_results[idempotency_key] = result

    @staticmethod
    def get_lock(lock_key: str) -> asyncio.Lock:
        """Return a shared in-process asyncio lock for the given key."""
        if lock_key not in _sync_locks:
            _sync_locks[lock_key] = asyncio.Lock()
        return _sync_locks[lock_key]

    @staticmethod
    def ensure_lock_available(lock: asyncio.Lock, detail: str) -> None:
        """Fail fast when a lock is already held."""
        if lock.locked():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail,
            )

    def create_sync_log(
        self,
        *,
        user: User,
        ip_address: Optional[str],
        current_step: str = "events",
    ) -> SyncLog:
        """Create and persist a new sync log entry."""
        sync_log = SyncLog(
            user_id=user.id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            details={
                "progress_percent": 0,
                "current_step": current_step,
                "initiated_by": f"{user.first_name} {user.last_name}".strip(),
            },
            ip_address=ip_address,
        )
        self.session.add(sync_log)
        self.session.commit()
        self.session.refresh(sync_log)
        return sync_log

    def finalize_events_sync_log(
        self,
        sync_log: SyncLog,
        *,
        start_time: datetime,
        details_payload: dict[str, Any],
        events_created_total: int,
        events_updated_total: int,
        orchestrated: bool,
    ) -> None:
        """Persist event-sync completion details for the current sync run."""
        existing_details = sync_log.details or {}

        sync_log.events_created = events_created_total
        sync_log.events_updated = events_updated_total

        if orchestrated:
            sync_log.status = "in_progress"
            sync_log.finished_at = None
            sync_log.duration_seconds = None
            sync_log.details = {
                **details_payload,
                "progress_percent": max(int(existing_details.get("progress_percent") or 0), 5),
                "current_step": "events",
            }
        else:
            sync_log.status = "success"
            sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
            sync_log.details = {
                **details_payload,
                "progress_percent": 100,
                "current_step": "completed",
            }

        self.session.add(sync_log)
        self.session.commit()
        self.cleanup_old_sync_logs()

    def fail_sync_log(
        self,
        sync_log: SyncLog,
        *,
        start_time: datetime,
        error_message: str,
    ) -> None:
        """Persist failure details for the current sync run."""
        sync_log.status = "failed"
        sync_log.finished_at = datetime.now(timezone.utc)
        sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
        sync_log.error_message = error_message
        self.session.add(sync_log)
        self.session.commit()
        self.cleanup_old_sync_logs()

    async def run_event_sync(
        self,
        *,
        event_id: int,
        user_id: int,
        idempotency_key: str,
        sync_log_id: Optional[int],
        lock_prefix: str,
        lock_conflict_detail: str,
        missing_event_detail: str,
        skipped_message_factory: Callable[[SportEvent, ArenaSource], str],
        success_message_factory: Callable[[SportEvent], str],
        sync_callable: Callable[[str, int, ArenaSource], Awaitable[dict[str, Any]]],
    ) -> dict[str, Any]:
        """Run the common event-based sync flow used by multiple admin endpoints."""
        cached_result = self.get_cached_result(idempotency_key)
        if cached_result:
            return cached_result

        self.ensure_sync_run_access(sync_log_id, allow_start_new=False)

        lock = self.get_lock(f"{lock_prefix}_{event_id}")
        self.ensure_lock_available(lock, lock_conflict_detail)

        async with lock:
            event = self.session.exec(
                select(SportEvent).where(SportEvent.id == event_id)
            ).first()
            if not event:
                raise HTTPException(status_code=404, detail=missing_event_detail)

            source = self.get_active_arena_source(user_id)
            event_uuid = await self.resolve_event_uuid_for_source(event, source)
            if event_uuid is None:
                return {
                    "message": skipped_message_factory(event, source),
                    "skipped": True,
                    "event_id": event_id,
                }

            try:
                sync_result = await sync_callable(event_uuid, event_id, source)
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Sync failed: {str(exc)}",
                ) from exc

            result = {
                "message": success_message_factory(event),
                "count": sync_result.get("synced_count", 0) if isinstance(sync_result, dict) else 0,
                "created": sync_result.get("created", 0) if isinstance(sync_result, dict) else 0,
                "updated": sync_result.get("updated", 0) if isinstance(sync_result, dict) else 0,
                "event_id": event_id,
                "idempotency_key": idempotency_key,
            }
            self.cache_result(idempotency_key, result)
            return result
