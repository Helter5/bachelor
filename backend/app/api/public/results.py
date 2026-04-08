"""Public API - results (served from database)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from sqlalchemy import text
from typing import List, Any
import logging

from ...database import get_session

router = APIRouter(prefix="/results")
logger = logging.getLogger(__name__)


@router.get("/{event_id}", response_model=List[Any])
async def get_results(event_id: int, session: Session = Depends(get_session)):
    """
    Get fight results for an event from the local database.

    Path parameters:
    - **event_id**: Local database ID of the event
    """
    try:
        logger.info(f"Fetching results from DB for event: {event_id}")

        rows = session.execute(text("""
            SELECT
                f.id::text                       AS id,
                wc.max_weight,
                wc.is_completed                  AS weight_category_completed,
                d.sport_name,
                d.audience_name,
                a1.id::text                      AS fighter1_id,
                (p1.first_name || ' ' || p1.last_name) AS fighter1_full_name,
                t1.name                          AS team1_name,
                a2.id::text                      AS fighter2_id,
                (p2.first_name || ' ' || p2.last_name) AS fighter2_full_name,
                t2.name                          AS team2_name,
                aw.id::text                      AS winner_fighter,
                f.cp_one                         AS fighter1_ranking_point,
                f.cp_two                         AS fighter2_ranking_point,
                f.tp_one,
                f.tp_two,
                f.victory_type,
                vt.type                          AS victory_type_name,
                f.duration                       AS end_time,
                f.round_name                     AS round_friendly_name,
                f.fight_number
            FROM fights f
            JOIN sport_events se ON se.id = f.sport_event_id
            LEFT JOIN weight_categories wc ON wc.id = f.weight_category_id
            LEFT JOIN disciplines d ON d.id = wc.discipline_id
            LEFT JOIN athletes a1 ON a1.id = f.fighter_one_id
            LEFT JOIN persons p1 ON p1.id = a1.person_id
            LEFT JOIN teams t1 ON t1.id = a1.team_id
            LEFT JOIN athletes a2 ON a2.id = f.fighter_two_id
            LEFT JOIN persons p2 ON p2.id = a2.person_id
            LEFT JOIN teams t2 ON t2.id = a2.team_id
            LEFT JOIN athletes aw ON aw.id = f.winner_id
            LEFT JOIN victory_types vt ON vt.code = f.victory_type
            WHERE se.id = :event_id
            ORDER BY f.fight_number NULLS LAST, f.id
        """), {"event_id": event_id}).fetchall()

        results = []
        for row in rows:
            wc_name = f"{row.max_weight} kg" if row.max_weight is not None else ""

            tp_list = []
            if row.fighter1_id and row.tp_one is not None:
                tp_list.append({"fighterId": row.fighter1_id, "points": row.tp_one})
            if row.fighter2_id and row.tp_two is not None:
                tp_list.append({"fighterId": row.fighter2_id, "points": row.tp_two})

            results.append({
                "id": row.id,
                "weightCategoryName": wc_name,
                "weightCategoryAlternateName": wc_name,
                "sportName": row.sport_name or "",
                "audienceName": row.audience_name or "",
                "fighter1Id": row.fighter1_id or "",
                "fighter1FullName": row.fighter1_full_name or "",
                "fighter1DisplayName": row.fighter1_full_name or "",
                "fighter2Id": row.fighter2_id or "",
                "fighter2FullName": row.fighter2_full_name or "",
                "fighter2DisplayName": row.fighter2_full_name or "",
                "team1FullName": row.team1_name or "",
                "team2FullName": row.team2_name or "",
                "resultText": "",
                "resultTextSmall": "",
                "roundFriendlyName": row.round_friendly_name or "",
                "victoryType": row.victory_type or "",
                "victoryTypeName": row.victory_type_name or row.victory_type or "",
                "winnerFighter": row.winner_fighter,
                "status": 5,
                "weightCategoryCompleted": row.weight_category_completed or False,
                "fightNumber": row.fight_number or 0,
                "technicalPoints": tp_list,
                "endTime": row.end_time or 0,
                "fighter1RankingPoint": row.fighter1_ranking_point or 0,
                "fighter2RankingPoint": row.fighter2_ranking_point or 0,
                "roundScores": [],
            })

        logger.info(f"Returned {len(results)} results from DB for event {event_id}")
        return results

    except Exception as e:
        logger.error(f"Failed to fetch results for event {event_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch results: {str(e)}"
        )
