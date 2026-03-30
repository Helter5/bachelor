"""Protected Admin API - sync management (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header, Request
from sqlmodel import Session, select, col
from typing import Optional
import asyncio
from datetime import datetime, timezone

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.sync_log import SyncLog
from ....domain.entities.arena_source import ArenaSource
from ....domain.entities.sport_event import SportEvent
from ....core.dependencies import require_admin, validate_csrf_and_origin
from ....services.athlete_service import AthleteService
from ....services.team_service import TeamService
from ....services.sport_event_service import SportEventService
from ....services.weight_category_service import WeightCategoryService
from ....services.fight_service import FightService
from ....services.victory_type_service import VictoryTypeService
from ....config import get_settings

_settings = get_settings()


def _cleanup_old_sync_logs(session: Session) -> None:
    """Keep only the most recent sync logs, delete the rest."""
    keep_ids_stmt = (
        select(SyncLog.id)
        .order_by(col(SyncLog.started_at).desc())
        .limit(_settings.sync_log_max_entries)
    )
    keep_ids = [row for row in session.exec(keep_ids_stmt).all()]

    if not keep_ids:
        return

    old_logs_stmt = select(SyncLog).where(SyncLog.id.notin_(keep_ids))
    old_logs = session.exec(old_logs_stmt).all()
    for log in old_logs:
        session.delete(log)
    if old_logs:
        session.commit()

router = APIRouter(prefix="/admin/sync")

# PRODUCTION WARNING: These in-memory locks/cache only work for single-instance deployments
# For multi-worker or multi-instance production:
#   - Move locks to Redis (redlock algorithm) or PostgreSQL advisory locks
#   - Move cache to Redis with TTL expiry
# Current implementation is suitable for:
#   - Development environments
#   - Single uvicorn worker (--workers 1)
#   - Docker Compose with single backend container

# Global locks for sync operations (prevent concurrent syncs for same resource)
_sync_locks: dict[str, asyncio.Lock] = {}
_sync_results: dict[str, dict] = {}  # Store results by idempotency key


def _get_user_arena_source(user: User, session: Session) -> ArenaSource:
    """Return the enabled ArenaSource belonging to the requesting user."""
    source = session.exec(
        select(ArenaSource).where(
            ArenaSource.user_id == user.id,
            ArenaSource.is_enabled == True,
        )
    ).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nemáte nakonfigurovanú Arena inštanciu. Pridajte ju v Nastaveniach → Arena Zdroje.",
        )
    return source


def _get_source_event_uuid(session: Session, event: SportEvent, source: ArenaSource) -> str:
    """Return the Arena UUID this source uses for the given event."""
    from ....domain.entities.sport_event_source_uid import SportEventSourceUid
    mapping = session.exec(
        select(SportEventSourceUid).where(
            SportEventSourceUid.sport_event_id == event.id,
            SportEventSourceUid.arena_source_id == source.id,
        )
    ).first()
    return str(mapping.source_uuid) if mapping else str(event.arena_uuid)


@router.post("/events")
async def sync_events(
    background_tasks: BackgroundTasks,
    request: Request,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Sync sport events from Arena API (admin only)
    
    Requires: Admin role + CSRF token + Origin validation
    
    Idempotency: Provide X-Idempotency-Key header to safely retry
    Locking: Only one sync of events can run at a time
    """
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"sync_events_{datetime.now(timezone.utc).isoformat()}"
    
    # Check if already processed (idempotency)
    if idempotency_key in _sync_results:
        return _sync_results[idempotency_key]
    
    # Acquire lock for events sync (asyncio.Lock for async context)
    lock_key = "events"
    if lock_key not in _sync_locks:
        _sync_locks[lock_key] = asyncio.Lock()
    lock = _sync_locks[lock_key]
    
    # Try to acquire lock without blocking
    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Events sync already in progress. Please wait or retry with same idempotency key."
        )
    
    async with lock:
        # Initialize service
        service = SportEventService(session)

        # Create sync log entry
        # Get IP address
        from ....core.security import get_client_ip
        ip_address = get_client_ip(request)

        sync_log = SyncLog(
            user_id=user.id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            ip_address=ip_address
        )
        session.add(sync_log)
        session.commit()
        session.refresh(sync_log)

        start_time = datetime.now(timezone.utc)

        try:
            # Use the requesting user's Arena source
            source = _get_user_arena_source(user, session)

            # Fetch events from user's Arena source
            arena_data = await service.get_all_from_arena_source(source)
            events_data = arena_data.get("events", {})
            events_list = events_data.get("items", [])

            total_synced_events = []
            events_created_total = 0
            events_updated_total = 0

            for event_data in events_list:
                from ....domain import SportEventBase

                # Map Arena API fields (camelCase) to database fields (snake_case)
                if 'id' in event_data:
                    event_data['arena_uuid'] = event_data['id']
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
                sync_result = await service.sync_event(event_base, source=source)
                total_synced_events.append(sync_result)

                if sync_result.get("matched_by") == "new":
                    events_created_total += 1
                elif sync_result.get("matched_by") == "updated":
                    events_updated_total += 1

            # Update last_sync_at for the source
            source.last_sync_at = datetime.now(timezone.utc)
            session.add(source)
            session.commit()

            # Update sync log
            sync_log.status = "success"
            sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
            sync_log.events_created = events_created_total
            sync_log.events_updated = events_updated_total
            sync_log.details = {"source_id": source.id, "host": f"{source.host}:{source.port}"}
            session.add(sync_log)
            session.commit()
            _cleanup_old_sync_logs(session)

            result = {
                "message": f"Successfully synced {len(total_synced_events)} events",
                "count": len(total_synced_events),
                "idempotency_key": idempotency_key,
                "sync_log_id": sync_log.id
            }

            # Store result for idempotency (cache for 1 hour in production)
            _sync_results[idempotency_key] = result

            return result
        except Exception as e:
            # Update sync log with failure
            sync_log.status = "failed"
            sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
            sync_log.error_message = str(e)
            session.add(sync_log)
            session.commit()
            _cleanup_old_sync_logs(session)

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
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
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
    
    # Check if already processed (idempotency)
    if idempotency_key in _sync_results:
        return _sync_results[idempotency_key]
    
    # Acquire lock for this event's team sync (asyncio.Lock for async context)
    lock_key = f"teams_{event_id}"
    if lock_key not in _sync_locks:
        _sync_locks[lock_key] = asyncio.Lock()
    lock = _sync_locks[lock_key]
    
    # Try to acquire lock without blocking
    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Teams sync for event {event_id} already in progress. Please wait or retry with same idempotency key."
        )
    
    async with lock:
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        source = _get_user_arena_source(user, session)
        service = TeamService(session)

        try:
            event_uuid = _get_source_event_uuid(session, event, source)
            teams = await service.sync_teams_for_event(event_uuid, source=source)
            result = {
                "message": f"Successfully synced teams for event {event.name}",
                "count": teams.get('synced_count', 0) if isinstance(teams, dict) else 0,
                "created": teams.get('created', 0) if isinstance(teams, dict) else 0,
                "updated": teams.get('updated', 0) if isinstance(teams, dict) else 0,
                "event_id": event_id,
                "idempotency_key": idempotency_key
            }
            
            # Store result for idempotency
            _sync_results[idempotency_key] = result
            
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sync failed: {str(e)}"
            )


@router.post("/athletes/{event_id}")
async def sync_athletes(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
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
    
    # Check if already processed (idempotency)
    if idempotency_key in _sync_results:
        return _sync_results[idempotency_key]
    
    # Acquire lock for this event's athlete sync (asyncio.Lock for async context)
    lock_key = f"athletes_{event_id}"
    if lock_key not in _sync_locks:
        _sync_locks[lock_key] = asyncio.Lock()
    lock = _sync_locks[lock_key]
    
    # Try to acquire lock without blocking
    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Athletes sync for event {event_id} already in progress. Please wait or retry with same idempotency key."
        )
    
    async with lock:
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        source = _get_user_arena_source(user, session)
        service = AthleteService(session)

        try:
            event_uuid = _get_source_event_uuid(session, event, source)
            athletes = await service.sync_athletes_for_event(event_uuid, source=source)
            result = {
                "message": f"Successfully synced athletes for event {event.name}",
                "count": athletes.get('synced_count', 0) if isinstance(athletes, dict) else 0,
                "created": athletes.get('created', 0) if isinstance(athletes, dict) else 0,
                "updated": athletes.get('updated', 0) if isinstance(athletes, dict) else 0,
                "event_id": event_id,
                "idempotency_key": idempotency_key
            }
            
            # Store result for idempotency
            _sync_results[idempotency_key] = result
            
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sync failed: {str(e)}"
            )


@router.post("/categories/{event_id}")
async def sync_categories(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),  # CSRF + Origin validation
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
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
    
    # Check if already processed (idempotency)
    if idempotency_key in _sync_results:
        return _sync_results[idempotency_key]
    
    # Acquire lock for this event's category sync (asyncio.Lock for async context)
    lock_key = f"categories_{event_id}"
    if lock_key not in _sync_locks:
        _sync_locks[lock_key] = asyncio.Lock()
    lock = _sync_locks[lock_key]
    
    # Try to acquire lock without blocking
    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Categories sync for event {event_id} already in progress. Please wait or retry with same idempotency key."
        )
    
    async with lock:
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        source = _get_user_arena_source(user, session)
        service = WeightCategoryService(session)

        try:
            event_uuid = _get_source_event_uuid(session, event, source)
            categories = await service.sync_weight_categories_for_event(event_uuid, source=source)
            result = {
                "message": f"Successfully synced categories for event {event.name}",
                "count": categories.get('synced_count', 0) if isinstance(categories, dict) else 0,
                "created": categories.get('created', 0) if isinstance(categories, dict) else 0,
                "updated": categories.get('updated', 0) if isinstance(categories, dict) else 0,
                "event_id": event_id,
                "idempotency_key": idempotency_key
            }
            
            # Store result for idempotency
            _sync_results[idempotency_key] = result
            
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sync failed: {str(e)}"
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
    source = _get_user_arena_source(user, session)
    service = VictoryTypeService(session)
    result = await service.sync_for_sport(sport_id, source=source)
    return {
        "message": f"Successfully synced victory types for sport '{sport_id}'",
        "created": result["created"],
        "updated": result["updated"],
    }


@router.post("/full/{event_id}")
async def sync_full(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """
    Sync all data for a specific event: teams → athletes → categories → fights (admin only)
    """
    from ....domain import SportEvent
    event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    source = _get_user_arena_source(user, session)
    event_uuid = _get_source_event_uuid(session, event, source)

    results = {}
    try:
        teams = await TeamService(session).sync_teams_for_event(event_uuid, source=source)
        results["teams"] = {"created": teams.get("created", 0), "updated": teams.get("updated", 0)}
    except Exception as e:
        results["teams"] = {"error": str(e)}

    try:
        athletes = await AthleteService(session).sync_athletes_for_event(event_uuid, source=source)
        results["athletes"] = {"created": athletes.get("created", 0), "updated": athletes.get("updated", 0)}
    except Exception as e:
        results["athletes"] = {"error": str(e)}

    try:
        categories = await WeightCategoryService(session).sync_weight_categories_for_event(event_uuid, source=source)
        results["categories"] = {"created": categories.get("created", 0), "updated": categories.get("updated", 0)}
    except Exception as e:
        results["categories"] = {"error": str(e)}

    try:
        fights = await FightService(session).sync_fights_for_event(event_uuid, source=source)
        results["fights"] = {"created": fights.get("created", 0), "updated": fights.get("updated", 0)}
    except Exception as e:
        results["fights"] = {"error": str(e)}

    return {"message": f"Full sync completed for event {event.name}", "event_id": event_id, "results": results}


@router.post("/fights/{event_id}")
async def sync_fights(
    event_id: int,
    _: None = Depends(validate_csrf_and_origin),
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Sync fights for specific event from Arena API (admin only)
    """
    if not idempotency_key:
        idempotency_key = f"sync_fights_{event_id}_{datetime.now(timezone.utc).isoformat()}"

    if idempotency_key in _sync_results:
        return _sync_results[idempotency_key]

    lock_key = f"fights_{event_id}"
    if lock_key not in _sync_locks:
        _sync_locks[lock_key] = asyncio.Lock()
    lock = _sync_locks[lock_key]

    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fights sync for event {event_id} already in progress."
        )

    async with lock:
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        source = _get_user_arena_source(user, session)
        service = FightService(session)

        try:
            event_uuid = _get_source_event_uuid(session, event, source)
            fights = await service.sync_fights_for_event(event_uuid, source=source)
            result = {
                "message": f"Successfully synced fights for event {event.name}",
                "count": fights.get('synced_count', 0) if isinstance(fights, dict) else 0,
                "created": fights.get('created', 0) if isinstance(fights, dict) else 0,
                "updated": fights.get('updated', 0) if isinstance(fights, dict) else 0,
                "event_id": event_id,
                "idempotency_key": idempotency_key
            }

            _sync_results[idempotency_key] = result
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sync failed: {str(e)}"
            )


