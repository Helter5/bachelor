"""Protected Admin API - sync management (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header, Request
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime, timezone

from ....database import get_session
from ....domain.entities.user import User
from ....core.dependencies import require_admin, validate_csrf_and_origin
from ....services.athlete_service import AthleteService
from ....services.admin_sync_service import AdminSyncService, _sync_locks
from ....services.team_service import TeamService
from ....services.sport_event_service import SportEventService
from ....services.weight_category_service import WeightCategoryService
from ....services.fight_service import FightService
from ....services.victory_type_service import VictoryTypeService
from ....services.referee_service import RefereeService

router = APIRouter(prefix="/admin/sync")

# PRODUCTION WARNING: These in-memory locks/cache only work for single-instance deployments
# For multi-worker or multi-instance production:
#   - Move locks to Redis (redlock algorithm) or PostgreSQL advisory locks
#   - Move cache to Redis with TTL expiry
# Current implementation is suitable for:
#   - Development environments
#   - Single uvicorn worker (--workers 1)
#   - Docker Compose with single backend container

@router.post("/events")
async def sync_events(
    background_tasks: BackgroundTasks,
    request: Request,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_orchestrated: Optional[str] = Header(None, alias="X-Sync-Orchestrated")
):
    """
    Sync sport events from Arena API (admin only)
    
    Requires: Admin role + CSRF token + Origin validation
    
    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync of events can run at a time
    """
    sync_admin = AdminSyncService(session)
    sync_admin.ensure_sync_run_access(None, allow_start_new=True)

    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"sync_events_{datetime.now(timezone.utc).isoformat()}"
    
    # Check if already processed (idempotency)
    cached_result = sync_admin.get_cached_result(idempotency_key)
    if cached_result:
        return cached_result
    
    # Acquire lock for events sync (asyncio.Lock for async context)
    lock = sync_admin.get_lock("events")
    sync_admin.ensure_lock_available(
        lock,
        "Events sync already in progress. Please wait or retry with same idempotency key.",
    )
    
    async with lock:
        # Initialize service
        service = SportEventService(session)

        # Create sync log entry
        # Get IP address
        from ....core.security import get_client_ip
        ip_address = get_client_ip(request)

        sync_log = sync_admin.create_sync_log(user=user, ip_address=ip_address, current_step="events")

        start_time = datetime.now(timezone.utc)

        try:
            from ....domain import SportEventBase
            source = sync_admin.get_active_arena_source(user.id)

            arena_data = await service.get_all_from_arena_source(source)
            events_list = arena_data.get("events", {}).get("items", [])

            total_synced_events = []
            events_created_total = 0
            events_updated_total = 0

            for event_data in events_list:
                if 'id' in event_data:
                    event_data.pop('id')
                if 'startDate' in event_data:
                    event_data['start_date'] = event_data['startDate']
                if 'endDate' in event_data:
                    event_data['end_date'] = event_data['endDate']
                if 'addressLocality' in event_data:
                    event_data['address_locality'] = event_data['addressLocality']
                if 'isIndividualEvent' in event_data:
                    event_data['is_individual_event'] = event_data['isIndividualEvent']
                if 'isTeamEvent' in event_data:
                    event_data['is_team_event'] = event_data['isTeamEvent']
                if 'isBeachWrestlingTournament' in event_data:
                    event_data['is_beach_wrestling'] = event_data['isBeachWrestlingTournament']
                if 'tournamentType' in event_data:
                    event_data['tournament_type'] = event_data['tournamentType']
                if 'eventType' in event_data:
                    event_data['event_type'] = event_data['eventType']
                if 'isSyncEnabled' in event_data:
                    event_data['is_sync_enabled'] = event_data['isSyncEnabled']
                if 'countryIsoCode' in event_data:
                    event_data['country_iso_code'] = event_data['countryIsoCode']

                event_base = SportEventBase(**event_data)
                sync_result = await service.sync_event(event_base)
                total_synced_events.append(sync_result)

                if sync_result.get("matched_by") == "new":
                    events_created_total += 1
                elif sync_result.get("matched_by") == "updated":
                    events_updated_total += 1

            source.last_sync_at = datetime.now(timezone.utc)
            session.add(source)
            session.commit()

            existing_details = sync_log.details or {}
            details_payload = {
                **existing_details,
                "source_id": source.id,
                "source_name": source.name,
                "host": f"{source.host}:{source.port}",
                "total_events": len(total_synced_events),
            }

            orchestrated = str(sync_orchestrated or "").strip().lower() in {"1", "true", "yes"}
            sync_admin.finalize_events_sync_log(
                sync_log,
                start_time=start_time,
                details_payload=details_payload,
                events_created_total=events_created_total,
                events_updated_total=events_updated_total,
                orchestrated=orchestrated,
            )

            result = {
                "message": f"Successfully synced {len(total_synced_events)} events",
                "count": len(total_synced_events),
                "idempotency_key": idempotency_key,
                "sync_log_id": sync_log.id
            }

            # Store result for idempotency (cache for 1 hour in production)
            sync_admin.cache_result(idempotency_key, result)

            return result
        except Exception as e:
            # Update sync log with failure
            sync_admin.fail_sync_log(sync_log, start_time=start_time, error_message=str(e))

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sync failed: {str(e)}"
            )


@router.post("/teams/{event_id}")
async def sync_teams(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_log_id: Optional[int] = Header(None, alias="X-Sync-Log-Id")
):
    """
    Sync teams for specific event from Arena API (admin only)
    
    Requires: Admin role + CSRF token + Origin validation
    
    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync per event can run at a time
    """
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"sync_teams_{event_id}_{datetime.now(timezone.utc).isoformat()}"
    
    sync_admin = AdminSyncService(session)
    service = TeamService(session)

    return await sync_admin.run_event_sync(
        event_id=event_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        sync_log_id=sync_log_id,
        lock_prefix="teams",
        lock_conflict_detail=f"Teams sync for event {event_id} already in progress. Please wait or retry with same idempotency key.",
        missing_event_detail=f"Event {event_id} not found",
        skipped_message_factory=lambda event, source: (
            f"Udalosť '{event.name}' sa nenachádza v aktívnom zdroji ({source.name}). Nie je čo synchronizovať."
        ),
        success_message_factory=lambda event: f"Successfully synced teams for event {event.name}",
        sync_callable=lambda event_uuid, event_id_arg, source: service.sync_teams_for_event(
            event_uuid,
            event_id=event_id_arg,
            source=source,
        ),
    )


@router.post("/athletes/{event_id}")
async def sync_athletes(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_log_id: Optional[int] = Header(None, alias="X-Sync-Log-Id")
):
    """
    Sync athletes for specific event from Arena API (admin only)
    
    Requires: Admin role + CSRF token + Origin validation
    
    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync per event can run at a time
    """
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"sync_athletes_{event_id}_{datetime.now(timezone.utc).isoformat()}"
    
    sync_admin = AdminSyncService(session)
    service = AthleteService(session)

    return await sync_admin.run_event_sync(
        event_id=event_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        sync_log_id=sync_log_id,
        lock_prefix="athletes",
        lock_conflict_detail=f"Athletes sync for event {event_id} already in progress. Please wait or retry with same idempotency key.",
        missing_event_detail=f"Event {event_id} not found",
        skipped_message_factory=lambda event, source: (
            f"Udalosť '{event.name}' sa nenachádza v aktívnom zdroji ({source.name}). Nie je čo synchronizovať."
        ),
        success_message_factory=lambda event: f"Successfully synced athletes for event {event.name}",
        sync_callable=lambda event_uuid, event_id_arg, source: service.sync_athletes_for_event(
            event_uuid,
            event_id=event_id_arg,
            source=source,
        ),
    )


@router.post("/categories/{event_id}")
async def sync_categories(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_log_id: Optional[int] = Header(None, alias="X-Sync-Log-Id")
):
    """
    Sync weight categories for specific event from Arena API (admin only)
    
    Requires: Admin role + CSRF token + Origin validation
    
    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync per event can run at a time
    """
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"sync_categories_{event_id}_{datetime.now(timezone.utc).isoformat()}"
    
    sync_admin = AdminSyncService(session)
    service = WeightCategoryService(session)

    return await sync_admin.run_event_sync(
        event_id=event_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        sync_log_id=sync_log_id,
        lock_prefix="categories",
        lock_conflict_detail=f"Categories sync for event {event_id} already in progress. Please wait or retry with same idempotency key.",
        missing_event_detail=f"Event {event_id} not found",
        skipped_message_factory=lambda event, source: (
            f"Udalosť '{event.name}' sa nenachádza v aktívnom zdroji ({source.name}). Nie je čo synchronizovať."
        ),
        success_message_factory=lambda event: f"Successfully synced categories for event {event.name}",
        sync_callable=lambda event_uuid, event_id_arg, source: service.sync_weight_categories_for_event(
            event_uuid,
            event_id=event_id_arg,
            source=source,
        ),
    )


@router.post("/victory-types/{sport_id}")
async def sync_victory_types(
    sport_id: str,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """
    Sync victory types for a specific sport from Arena API config (admin only)
    """
    sync_admin = AdminSyncService(session)
    source = sync_admin.get_active_arena_source(user.id)
    service = VictoryTypeService(session)
    result = await service.sync_for_sport(sport_id, source=source)
    return {
        "message": f"Successfully synced victory types for sport '{sport_id}'",
        "created": result["created"],
        "updated": result["updated"],
    }


@router.post("/fights/{event_id}")
async def sync_fights(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_log_id: Optional[int] = Header(None, alias="X-Sync-Log-Id")
):
    """
    Sync fights for specific event from Arena API (admin only)
    """
    if not idempotency_key:
        idempotency_key = f"sync_fights_{event_id}_{datetime.now(timezone.utc).isoformat()}"

    sync_admin = AdminSyncService(session)
    service = FightService(session)

    return await sync_admin.run_event_sync(
        event_id=event_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        sync_log_id=sync_log_id,
        lock_prefix="fights",
        lock_conflict_detail=f"Fights sync for event {event_id} already in progress.",
        missing_event_detail=f"Event {event_id} not found",
        skipped_message_factory=lambda event, source: (
            f"Udalosť '{event.name}' sa nenachádza v aktívnom zdroji ({source.name}). Nie je čo synchronizovať."
        ),
        success_message_factory=lambda event: f"Successfully synced fights for event {event.name}",
        sync_callable=lambda event_uuid, event_id_arg, source: service.sync_fights_for_event(
            event_uuid,
            event_id=event_id_arg,
            source=source,
        ),
    )


@router.post("/referees/{event_id}")
async def sync_referees(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    sync_log_id: Optional[int] = Header(None, alias="X-Sync-Log-Id")
):
    """
    Sync referees for specific event from Arena API (admin only)

    Requires: Admin role + CSRF token + Origin validation

    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync per event can run at a time
    """
    if not idempotency_key:
        idempotency_key = f"sync_referees_{event_id}_{datetime.now(timezone.utc).isoformat()}"

    sync_admin = AdminSyncService(session)
    service = RefereeService(session)

    return await sync_admin.run_event_sync(
        event_id=event_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        sync_log_id=sync_log_id,
        lock_prefix="referees",
        lock_conflict_detail=f"Referees sync for event {event_id} already in progress. Please wait or retry with same idempotency key.",
        missing_event_detail=f"Event {event_id} not found",
        skipped_message_factory=lambda event, source: (
            f"Udalosť '{event.name}' sa nenachádza v aktívnom zdroji ({source.name}). Nie je čo synchronizovať."
        ),
        success_message_factory=lambda event: f"Successfully synced referees for event {event.name}",
        sync_callable=lambda event_uuid, event_id_arg, source: service.sync_referees_for_event(
            event_uuid,
            event_id=event_id_arg,
            source=source,
        ),
    )
