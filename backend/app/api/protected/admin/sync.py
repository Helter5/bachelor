"""Protected Admin API - sync management (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header, Request
from sqlmodel import Session, select, col
from typing import Literal, Optional
import asyncio
from datetime import datetime

from ....database import get_session
from ....domain.entities.user import User
from ....domain.entities.sync_log import SyncLog
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
        idempotency_key = f"sync_events_{datetime.utcnow().isoformat()}"
    
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
            started_at=datetime.utcnow(),
            ip_address=ip_address
        )
        session.add(sync_log)
        session.commit()
        session.refresh(sync_log)

        start_time = datetime.utcnow()

        try:
            # Get all enabled arena sources
            from ....domain.entities.arena_source import ArenaSource
            statement = select(ArenaSource).where(ArenaSource.is_enabled == True)
            sources = session.exec(statement).all()

            if not sources:
                # Update log with failure
                sync_log.status = "failed"
                sync_log.finished_at = datetime.utcnow()
                sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
                sync_log.error_message = "No enabled arena sources configured"
                session.add(sync_log)
                session.commit()
                _cleanup_old_sync_logs(session)

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No enabled arena sources configured. Please add at least one arena source in Settings."
                )

            total_synced_events = []
            source_results = []

            events_created_total = 0
            events_updated_total = 0

            # Sync from each enabled source
            for source in sources:
                try:
                    # Fetch events from this Arena source
                    arena_data = await service.get_all_from_arena_source(source)

                    # Extract events from Arena API response structure
                    # Arena returns: {"events": {"items": [...], "totalCount": N}}
                    events_data = arena_data.get("events", {})
                    events_list = events_data.get("items", [])

                    # Sync each event to database
                    synced_count = 0
                    source_events_created = 0
                    source_events_updated = 0

                    for event_data in events_list:
                        from ....domain import SportEventBase

                        # Map Arena API fields (camelCase) to database fields (snake_case)
                        if 'id' in event_data:
                            event_data['arena_uuid'] = event_data['id']  # Arena UUID stored for reference
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
                        synced_count += 1

                        # Track created vs updated
                        if sync_result.get("matched_by") == "new":
                            source_events_created += 1
                            events_created_total += 1
                        elif sync_result.get("matched_by") == "updated":
                            source_events_updated += 1
                            events_updated_total += 1

                    # Update last_sync_at for this source
                    source.last_sync_at = datetime.utcnow()
                    session.add(source)
                    session.commit()

                    source_results.append({
                        "source_id": source.id,
                        "host": f"{source.host}:{source.port}",
                        "events_synced": synced_count,
                        "success": True
                    })

                except Exception as source_error:
                    # Log error for this source but continue with others
                    source_results.append({
                        "source_id": source.id,
                        "host": f"{source.host}:{source.port}",
                        "events_synced": 0,
                        "success": False,
                        "error": str(source_error)
                    })

            # Check if any source failed
            any_failed = any(not result.get("success", True) for result in source_results)
            all_failed = all(not result.get("success", True) for result in source_results)

            # Update sync log
            if all_failed:
                sync_log.status = "failed"
                sync_log.error_message = "All sources failed"
            elif any_failed:
                sync_log.status = "failed"
                failed_sources = [r for r in source_results if not r.get("success", True)]
                sync_log.error_message = f"{len(failed_sources)} source(s) failed"
            else:
                sync_log.status = "success"

            sync_log.finished_at = datetime.utcnow()
            sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
            sync_log.events_created = events_created_total
            sync_log.events_updated = events_updated_total
            sync_log.details = {
                "sources_synced": len(sources),
                "source_results": source_results
            }
            session.add(sync_log)
            session.commit()
            _cleanup_old_sync_logs(session)

            # If all sources failed, raise error so frontend shows failure
            if all_failed:
                failed_errors = [r.get("error", "Unknown error") for r in source_results if not r.get("success")]
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Synchronizácia zlyhala: {'; '.join(failed_errors)}"
                )

            result = {
                "message": f"Successfully synced {len(total_synced_events)} events from {len(sources)} sources",
                "count": len(total_synced_events),
                "sources": source_results,
                "idempotency_key": idempotency_key,
                "sync_log_id": sync_log.id
            }

            # Store result for idempotency (cache for 1 hour in production)
            _sync_results[idempotency_key] = result

            return result
        except Exception as e:
            # Update sync log with failure
            sync_log.status = "failed"
            sync_log.finished_at = datetime.utcnow()
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
        idempotency_key = f"sync_teams_{event_id}_{datetime.utcnow().isoformat()}"
    
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
        # Get event from database to get UUID
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
        
        # Initialize service
        service = TeamService(session)
        
        try:
            teams = await service.sync_teams_for_event(str(event.arena_uuid))
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
        idempotency_key = f"sync_athletes_{event_id}_{datetime.utcnow().isoformat()}"
    
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
        # Get event from database to get UUID
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
        
        # Initialize service
        service = AthleteService(session)
        
        try:
            athletes = await service.sync_athletes_for_event(str(event.arena_uuid))
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
        idempotency_key = f"sync_categories_{event_id}_{datetime.utcnow().isoformat()}"
    
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
        # Get event from database to get UUID
        from ....domain import SportEvent
        event = session.exec(select(SportEvent).where(SportEvent.id == event_id)).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
        
        # Initialize service
        service = WeightCategoryService(session)
        
        try:
            categories = await service.sync_weight_categories_for_event(str(event.arena_uuid))
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
    service = VictoryTypeService(session)
    result = await service.sync_for_sport(sport_id)
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
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Sync fights for specific event from Arena API (admin only)
    """
    if not idempotency_key:
        idempotency_key = f"sync_fights_{event_id}_{datetime.utcnow().isoformat()}"

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

        service = FightService(session)

        try:
            fights = await service.sync_fights_for_event(str(event.arena_uuid))
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


@router.post("/full/{event_id}", dependencies=[Depends(require_admin)])
async def sync_full_event(
    event_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Full sync for event: teams + categories + athletes (admin only)
    
    Runs in background. Use this for complete event synchronization.
    
    Requires: Admin role + Bearer token
    """
    return {
        "message": f"Full sync started for event {event_id}",
        "event_id": event_id,
        "status": "Use individual endpoints for now - background tasks not yet implemented"
    }
