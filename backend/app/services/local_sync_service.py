"""Service for local-agent sync uploads."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlmodel import Session, select

from ..config import get_settings
from ..core.security import ALGORITHM
from ..domain import SportEventBase
from ..domain.entities.athlete import Athlete
from ..domain.entities.discipline import Discipline
from ..domain.entities.person import Person
from ..domain.entities.sync_log import SyncLog
from ..domain.entities.team import Team
from ..domain.entities.user import User
from ..domain.entities.weight_category import WeightCategory
from .admin_sync_service import AdminSyncService
from .athlete_service import AthleteService
from .fight_service import FightService
from .referee_service import RefereeService
from .sport_event_service import SportEventService
from .team_service import TeamService
from .weight_category_service import WeightCategoryService

settings = get_settings()
SERVER_PROGRESS_START = 50
SERVER_PROGRESS_END = 99


class LocalSyncService:
    """Coordinates local-agent upload tokens, progress, and DB import stages."""

    def __init__(self, session: Session):
        self.session = session
        self.sync_admin = AdminSyncService(session)

    def start_sync(self, *, user: User, ip_address: Optional[str]) -> dict[str, Any]:
        self.sync_admin.ensure_sync_run_access(None, allow_start_new=True)
        source = self.sync_admin.get_active_arena_source(user.id)
        if not all([source.client_id, source.client_secret, source.api_key]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aktívny Arena zdroj nemá vyplnený Client ID, Client Secret alebo API kľúč.",
            )

        sync_log = self.sync_admin.create_sync_log(
            user=user,
            ip_address=ip_address,
            current_step="agent",
        )
        sync_log.details = {
            **(sync_log.details or {}),
            "mode": "local_agent",
            "source_id": source.id,
            "source_name": source.name,
            "host": f"{source.host}:{source.port}",
        }
        self.session.add(sync_log)
        self.session.commit()

        return {
            "sync_log_id": sync_log.id,
            "upload_token": self._create_upload_token(user.id, sync_log.id),
            "arena_source": {
                "host": source.host,
                "port": source.port,
                "client_id": source.client_id,
                "client_secret": source.client_secret,
                "api_key": source.api_key,
            },
        }

    async def run_upload(self, payload: dict[str, Any], authorization: Optional[str]) -> dict[str, Any]:
        token_payload = self._decode_upload_token(self._bearer_token(authorization))
        user_id = int(token_payload["sub"])
        sync_log_id = int(token_payload["sync_log_id"])

        self.sync_admin.ensure_sync_run_access(sync_log_id, allow_start_new=False)
        sync_log = self.session.get(SyncLog, sync_log_id)
        if not sync_log or sync_log.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local sync run not found")

        start_time = AdminSyncService.as_utc_datetime(sync_log.started_at)

        try:
            events = payload.get("events") or []
            event_payloads = payload.get("event_payloads") or {}
            if not isinstance(events, list) or not isinstance(event_payloads, dict):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid local sync payload")

            totals = self._empty_totals()
            event_id_by_arena_uuid = await self._sync_events(events, totals, sync_log)
            self._sync_event_bundles(events, event_payloads, event_id_by_arena_uuid, totals, sync_log)
            self._finalize_sync_log(sync_log, start_time, event_id_by_arena_uuid, totals)

            return {
                "message": f"Successfully synced {len(event_id_by_arena_uuid)} events via local agent",
                "sync_log_id": sync_log.id,
                **totals,
            }
        except HTTPException as exc:
            self.sync_admin.fail_sync_log(sync_log, start_time=start_time, error_message=str(exc.detail))
            raise
        except Exception as exc:
            self.session.rollback()
            self.sync_admin.fail_sync_log(sync_log, start_time=start_time, error_message=str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Local sync failed: {exc}",
            ) from exc

    def patch_progress(self, payload: dict[str, Any], authorization: Optional[str]) -> dict[str, bool]:
        token_payload = self._decode_upload_token(self._bearer_token(authorization))
        user_id = int(token_payload["sub"])
        sync_log_id = int(token_payload["sync_log_id"])

        sync_log = self.session.get(SyncLog, sync_log_id)
        if not sync_log or sync_log.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local sync run not found")
        if sync_log.status != "in_progress":
            return {"success": True}

        reported_progress = max(0, min(99, int(payload.get("progress_percent") or 0)))
        previous_progress = int((sync_log.details or {}).get("progress_percent") or 0)
        progress = max(previous_progress, reported_progress)
        current_step = str(payload.get("current_step") or "agent")
        current_event = payload.get("current_event")
        details = {
            **(sync_log.details or {}),
            "progress_percent": progress,
            "current_step": current_step,
        }
        if current_event:
            details["current_event"] = str(current_event)
        sync_log.details = details
        self.session.add(sync_log)
        self.session.commit()
        return {"success": True}

    def _create_upload_token(self, user_id: int, sync_log_id: int) -> str:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
        payload = {
            "sub": str(user_id),
            "sync_log_id": sync_log_id,
            "typ": "local_sync_upload",
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)

    def _decode_upload_token(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[ALGORITHM],
                audience=settings.jwt_audience,
                issuer=settings.jwt_issuer,
            )
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local sync token") from exc

        if payload.get("typ") != "local_sync_upload":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local sync token type")
        return payload

    @staticmethod
    def _bearer_token(authorization: Optional[str]) -> str:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing upload token")
        return authorization.split(" ", 1)[1].strip()

    @staticmethod
    def _empty_totals() -> dict[str, int]:
        return {
            "events_created": 0,
            "events_updated": 0,
            "teams_created": 0,
            "teams_updated": 0,
            "weight_categories_created": 0,
            "weight_categories_updated": 0,
            "athletes_created": 0,
            "athletes_updated": 0,
            "referees_created": 0,
            "referees_updated": 0,
            "fights_created": 0,
            "fights_updated": 0,
        }

    async def _sync_events(
        self,
        events: list[dict[str, Any]],
        totals: dict[str, int],
        sync_log: SyncLog,
    ) -> dict[str, int]:
        sport_event_service = SportEventService(self.session)
        event_id_by_arena_uuid: dict[str, int] = {}
        self._update_progress(sync_log, "events", SERVER_PROGRESS_START)

        for event_data in events:
            arena_uuid = event_data.get("id")
            result = await sport_event_service.sync_event(self._event_payload_to_base(event_data))
            if arena_uuid:
                event_id_by_arena_uuid[str(arena_uuid)] = int(result["id"])
            if result.get("matched_by") == "new":
                totals["events_created"] += 1
            elif result.get("matched_by") == "updated":
                totals["events_updated"] += 1

        return event_id_by_arena_uuid

    def _sync_event_bundles(
        self,
        events: list[dict[str, Any]],
        event_payloads: dict[str, Any],
        event_id_by_arena_uuid: dict[str, int],
        totals: dict[str, int],
        sync_log: SyncLog,
    ) -> None:
        team_service = TeamService(self.session)
        wc_service = WeightCategoryService(self.session)
        athlete_service = AthleteService(self.session)
        referee_service = RefereeService(self.session)
        fight_service = FightService(self.session)
        event_items = list(event_id_by_arena_uuid.items())
        stage_order = ["teams", "categories", "athletes", "referees", "fights"]

        for event_idx, (arena_uuid, event_db_id) in enumerate(event_items):
            bundle = event_payloads.get(arena_uuid) or {}
            teams = bundle.get("teams") or []
            categories = bundle.get("categories") or []
            athletes = bundle.get("athletes") or []
            referees = bundle.get("referees") or []
            fights = bundle.get("fights") or []
            event_name = next((item.get("name") for item in events if str(item.get("id")) == arena_uuid), None)

            self._update_stage_progress(sync_log, "teams", event_idx, len(event_items), 0, len(stage_order), event_name)
            team_result = team_service._sync_teams_list(teams, event_db_id)
            totals["teams_created"] += team_result["created"]
            totals["teams_updated"] += team_result["updated"]
            self.session.commit()

            self._update_stage_progress(sync_log, "categories", event_idx, len(event_items), 1, len(stage_order), event_name)
            wc_result = wc_service._sync_weight_categories_list(categories, event_db_id)
            totals["weight_categories_created"] += wc_result["created"]
            totals["weight_categories_updated"] += wc_result["updated"]
            self.session.commit()

            self._update_stage_progress(sync_log, "athletes", event_idx, len(event_items), 2, len(stage_order), event_name)
            athlete_result = athlete_service._sync_athletes_list(
                athletes,
                event_db_id,
                self._team_uuid_map(event_db_id, teams),
                athlete_service._build_wc_key_map(event_db_id),
            )
            totals["athletes_created"] += athlete_result["created"]
            totals["athletes_updated"] += athlete_result["updated"]
            self.session.commit()

            self._update_stage_progress(sync_log, "referees", event_idx, len(event_items), 3, len(stage_order), event_name)
            team_by_alt_name, team_by_name = referee_service._build_team_maps(event_db_id)
            referee_result = referee_service._sync_referees_list(referees, event_db_id, team_by_alt_name, team_by_name)
            totals["referees_created"] += referee_result["created"]
            totals["referees_updated"] += referee_result["updated"]
            self.session.commit()

            self._update_stage_progress(sync_log, "fights", event_idx, len(event_items), 4, len(stage_order), event_name)
            fight_result = fight_service._sync_fights_list(
                fights,
                event_db_id,
                self._athlete_uuid_map(event_db_id, athletes, teams),
                fight_service._build_wc_key_map(event_db_id),
            )
            totals["fights_created"] += fight_result["created"]
            totals["fights_updated"] += fight_result["updated"]
            self.session.commit()

    def _finalize_sync_log(
        self,
        sync_log: SyncLog,
        start_time: datetime,
        event_id_by_arena_uuid: dict[str, int],
        totals: dict[str, int],
    ) -> None:
        sync_log.events_created = totals["events_created"]
        sync_log.events_updated = totals["events_updated"]
        sync_log.teams_created = totals["teams_created"]
        sync_log.teams_updated = totals["teams_updated"]
        sync_log.weight_categories_created = totals["weight_categories_created"]
        sync_log.weight_categories_updated = totals["weight_categories_updated"]
        sync_log.athletes_created = totals["athletes_created"]
        sync_log.athletes_updated = totals["athletes_updated"]
        sync_log.referees_created = totals["referees_created"]
        sync_log.referees_updated = totals["referees_updated"]
        sync_log.fights_created = totals["fights_created"]
        sync_log.fights_updated = totals["fights_updated"]
        sync_log.status = "success"
        sync_log.finished_at = datetime.now(timezone.utc)
        sync_log.duration_seconds = int((sync_log.finished_at - start_time).total_seconds())
        sync_log.details = {
            **(sync_log.details or {}),
            "progress_percent": 100,
            "current_step": "completed",
            "total_events": len(event_id_by_arena_uuid),
        }
        self.session.add(sync_log)
        self.session.commit()
        self.sync_admin.cleanup_old_sync_logs()

    def _update_progress(
        self,
        sync_log: SyncLog,
        current_step: str,
        progress: int,
        current_event: Optional[str] = None,
    ) -> None:
        previous_progress = int((sync_log.details or {}).get("progress_percent") or 0)
        sync_log.details = {
            **(sync_log.details or {}),
            "current_step": current_step,
            "progress_percent": max(previous_progress, progress),
        }
        if current_event:
            sync_log.details["current_event"] = current_event
        self.session.add(sync_log)
        self.session.commit()

    def _update_stage_progress(
        self,
        sync_log: SyncLog,
        current_step: str,
        event_index: int,
        event_total: int,
        stage_index: int,
        stage_total: int,
        current_event: Optional[str],
    ) -> None:
        self._update_progress(
            sync_log,
            current_step,
            self._stage_progress(event_index, event_total, stage_index, stage_total),
            current_event,
        )

    @staticmethod
    def _stage_progress(event_index: int, event_total: int, stage_index: int, stage_total: int) -> int:
        if event_total <= 0 or stage_total <= 0:
            return SERVER_PROGRESS_START
        completed_units = (event_index * stage_total) + stage_index
        total_units = event_total * stage_total
        span = SERVER_PROGRESS_END - SERVER_PROGRESS_START
        return min(SERVER_PROGRESS_END, SERVER_PROGRESS_START + int((completed_units / total_units) * span))

    @staticmethod
    def _event_payload_to_base(event_data: dict[str, Any]) -> SportEventBase:
        data = dict(event_data)
        data.pop("id", None)
        field_map = {
            "startDate": "start_date",
            "endDate": "end_date",
            "addressLocality": "address_locality",
            "isIndividualEvent": "is_individual_event",
            "isTeamEvent": "is_team_event",
            "isBeachWrestlingTournament": "is_beach_wrestling",
            "tournamentType": "tournament_type",
            "eventType": "event_type",
            "isSyncEnabled": "is_sync_enabled",
            "countryIsoCode": "country_iso_code",
        }
        for arena_key, db_key in field_map.items():
            if arena_key in data:
                data[db_key] = data.pop(arena_key)
        return SportEventBase(**data)

    def _team_uuid_map(self, event_db_id: int, teams_payload: list[dict[str, Any]]) -> dict[str, int]:
        db_teams = self.session.exec(select(Team).where(Team.sport_event_id == event_db_id)).all()
        by_name = {team.name: team.id for team in db_teams}
        by_alt_name = {team.alternate_name: team.id for team in db_teams if team.alternate_name}

        result: dict[str, int] = {}
        for team in teams_payload:
            arena_uuid = team.get("id")
            name = team.get("name")
            if not arena_uuid or not name:
                continue
            if name in by_name:
                result[arena_uuid] = by_name[name]
            elif name in by_alt_name:
                result[arena_uuid] = by_alt_name[name]
        return result

    def _athlete_uuid_map(
        self,
        event_db_id: int,
        athletes_payload: list[dict[str, Any]],
        teams_payload: list[dict[str, Any]],
    ) -> dict[str, int]:
        arena_team_names = {team["id"]: team.get("name") for team in teams_payload if team.get("id")}
        disciplines = {
            discipline.id: (discipline.sport_id, discipline.audience_id)
            for discipline in self.session.exec(select(Discipline)).all()
        }
        rows = self.session.exec(
            select(Athlete, Person, Team, WeightCategory)
            .join(Person, Athlete.person_id == Person.id, isouter=True)
            .join(Team, Athlete.team_id == Team.id, isouter=True)
            .join(WeightCategory, Athlete.weight_category_id == WeightCategory.id, isouter=True)
            .where(Athlete.sport_event_id == event_db_id)
        ).all()

        db_lookup: dict[tuple[Any, ...], int] = {}
        for athlete, person, team, wc in rows:
            sport_id, audience_id = (
                disciplines.get(wc.discipline_id, (None, None))
                if wc and wc.discipline_id
                else (None, None)
            )
            db_lookup[
                (
                    person.full_name if person else None,
                    team.name if team else None,
                    wc.max_weight if wc else None,
                    sport_id,
                    audience_id,
                )
            ] = athlete.id

        result: dict[str, int] = {}
        for athlete in athletes_payload:
            arena_uuid = athlete.get("id")
            if not arena_uuid:
                continue
            team_uuid = athlete.get("sportEventTeamId") or athlete.get("teamId")
            wcs = athlete.get("weightCategories") or []
            wc_data = wcs[0] if wcs else {}
            key = (
                athlete.get("personFullName"),
                arena_team_names.get(team_uuid) if team_uuid else None,
                wc_data.get("maxWeight"),
                wc_data.get("sportId"),
                wc_data.get("audienceId"),
            )
            local_id = db_lookup.get(key)
            if local_id:
                result[arena_uuid] = local_id
        return result
