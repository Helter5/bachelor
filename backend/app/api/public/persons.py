"""Public API - persons / wrestlers (no authentication required)"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, or_, and_, col, func
from typing import Optional

from ...database import get_session
from ...domain.entities.person import Person
from ...domain.entities.athlete import Athlete
from ...domain.entities.fight import Fight
from ...domain.entities.sport_event import SportEvent
from ...domain.entities.team import Team
from ...domain.entities.weight_category import WeightCategory
from ...domain.schemas.responses import PersonOut

router = APIRouter(prefix="/persons")


@router.get("", response_model=list[PersonOut])
async def list_persons(
    name: Optional[str] = None,
    country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    """
    Get list of persons (public, no auth required)

    Query parameters:
    - **name**: Filter by name (partial match)
    - **country**: Filter by country ISO code
    - **skip**: Pagination offset
    - **limit**: Max records
    """
    # Subquery: count fights per person via their athletes
    fight_count_sub = (
        select(
            col(Athlete.person_id).label("person_id"),
            func.count(Fight.id).label("fight_count"),
        )
        .join(Fight, or_(
            Fight.fighter_one_id == Athlete.id,
            Fight.fighter_two_id == Athlete.id,
        ))
        .where(col(Athlete.person_id).is_not(None))
        .group_by(col(Athlete.person_id))
        .subquery()
    )

    statement = (
        select(Person, func.coalesce(fight_count_sub.c.fight_count, 0).label("fight_count"))
        .outerjoin(fight_count_sub, Person.id == fight_count_sub.c.person_id)
    )

    if name:
        statement = statement.where(Person.full_name.ilike(f"%{name}%"))
    if country:
        statement = statement.where(Person.country_iso_code == country.upper())

    statement = statement.order_by(Person.full_name).offset(skip).limit(limit)
    rows = session.exec(statement).all()

    result = []
    for person, fight_count in rows:
        out = PersonOut.model_validate(person, from_attributes=True)
        out.fight_count = fight_count
        result.append(out)

    return result


@router.get("/compare")
async def compare_persons(
    person1_id: int = Query(..., description="First wrestler person ID"),
    person2_id: int = Query(..., description="Second wrestler person ID"),
    include_common_opponents: bool = Query(False, description="Include fights against common opponents"),
    session: Session = Depends(get_session),
):
    """
    Compare two wrestlers head-to-head.
    Finds all fights between them across all events.
    """
    person1 = session.get(Person, person1_id)
    if not person1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with id {person1_id} not found",
        )

    person2 = session.get(Person, person2_id)
    if not person2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with id {person2_id} not found",
        )

    # Get all athlete IDs for each person
    p1_athlete_ids = [
        a.id for a in session.exec(
            select(Athlete).where(Athlete.person_id == person1_id)
        ).all()
    ]
    p2_athlete_ids = [
        a.id for a in session.exec(
            select(Athlete).where(Athlete.person_id == person2_id)
        ).all()
    ]

    if not p1_athlete_ids or not p2_athlete_ids:
        return {
            "person1": {"id": person1.id, "name": person1.full_name, "country": person1.country_iso_code},
            "person2": {"id": person2.id, "name": person2.full_name, "country": person2.country_iso_code},
            "total_fights": 0,
            "person1_wins": 0,
            "person2_wins": 0,
            "fights": [],
        }

    # Find fights where person1 and person2 faced each other
    fights = session.exec(
        select(Fight).where(
            or_(
                and_(
                    Fight.fighter_one_id.in_(p1_athlete_ids),
                    Fight.fighter_two_id.in_(p2_athlete_ids),
                ),
                and_(
                    Fight.fighter_one_id.in_(p2_athlete_ids),
                    Fight.fighter_two_id.in_(p1_athlete_ids),
                ),
            )
        )
    ).all()

    person1_wins = 0
    person2_wins = 0
    fight_list = []

    for fight in fights:
        # Determine which side is person1 and which is person2
        p1_is_fighter_one = fight.fighter_one_id in p1_athlete_ids

        if p1_is_fighter_one:
            p1_tp = fight.tp_one
            p2_tp = fight.tp_two
            p1_cp = fight.cp_one
            p2_cp = fight.cp_two
        else:
            p1_tp = fight.tp_two
            p2_tp = fight.tp_one
            p1_cp = fight.cp_two
            p2_cp = fight.cp_one

        # Determine winner
        winner = None
        winner_name = None
        if fight.winner_id:
            if fight.winner_id in p1_athlete_ids:
                winner = "person1"
                winner_name = person1.full_name
                person1_wins += 1
            elif fight.winner_id in p2_athlete_ids:
                winner = "person2"
                winner_name = person2.full_name
                person2_wins += 1

        event = session.get(SportEvent, fight.sport_event_id)
        wc = session.get(WeightCategory, fight.weight_category_id) if fight.weight_category_id else None

        fight_list.append({
            "fight_id": fight.id,
            "sport_event_name": event.name if event else None,
            "discipline": f"{wc.sport_name} - {wc.audience_name}" if wc and wc.sport_name and wc.audience_name else (wc.sport_name if wc else None),
            "weight_category": wc.name if wc else None,
            "person1_name": person1.full_name,
            "person2_name": person2.full_name,
            "person1_tp": p1_tp,
            "person2_tp": p2_tp,
            "person1_cp": p1_cp,
            "person2_cp": p2_cp,
            "victory_type": fight.victory_type,
            "duration": fight.duration,
            "winner": winner,
            "winner_name": winner_name,
        })

    result = {
        "person1": {"id": person1.id, "name": person1.full_name, "country": person1.country_iso_code},
        "person2": {"id": person2.id, "name": person2.full_name, "country": person2.country_iso_code},
        "total_fights": len(fight_list),
        "person1_wins": person1_wins,
        "person2_wins": person2_wins,
        "fights": fight_list,
    }

    if include_common_opponents and p1_athlete_ids and p2_athlete_ids:
        # Get all fights for person1 and person2 to find their opponents
        p1_fights = session.exec(
            select(Fight).where(
                or_(
                    Fight.fighter_one_id.in_(p1_athlete_ids),
                    Fight.fighter_two_id.in_(p1_athlete_ids),
                )
            )
        ).all()
        p2_fights = session.exec(
            select(Fight).where(
                or_(
                    Fight.fighter_one_id.in_(p2_athlete_ids),
                    Fight.fighter_two_id.in_(p2_athlete_ids),
                )
            )
        ).all()

        # Collect opponent athlete IDs → resolve to person IDs
        def get_opponent_person_ids(fights_list, my_athlete_ids):
            opp_athlete_ids = set()
            for f in fights_list:
                if f.fighter_one_id in my_athlete_ids and f.fighter_two_id:
                    opp_athlete_ids.add(f.fighter_two_id)
                elif f.fighter_two_id in my_athlete_ids and f.fighter_one_id:
                    opp_athlete_ids.add(f.fighter_one_id)
            # Resolve athlete IDs to person IDs
            person_ids = set()
            if opp_athlete_ids:
                athletes = session.exec(
                    select(Athlete).where(Athlete.id.in_(opp_athlete_ids))
                ).all()
                for a in athletes:
                    if a.person_id:
                        person_ids.add(a.person_id)
            return person_ids

        p1_opponent_persons = get_opponent_person_ids(p1_fights, set(p1_athlete_ids))
        p2_opponent_persons = get_opponent_person_ids(p2_fights, set(p2_athlete_ids))

        # Exclude person1 and person2 themselves
        common_person_ids = (p1_opponent_persons & p2_opponent_persons) - {person1_id, person2_id}

        common_opponents = []
        for opp_person_id in common_person_ids:
            opp_person = session.get(Person, opp_person_id)
            if not opp_person:
                continue

            opp_athlete_ids = [
                a.id for a in session.exec(
                    select(Athlete).where(Athlete.person_id == opp_person_id)
                ).all()
            ]
            if not opp_athlete_ids:
                continue

            def build_fight_info(fight, my_athlete_ids, my_person_name, opp_person_name):
                my_is_one = fight.fighter_one_id in my_athlete_ids
                w_tp = fight.tp_one if my_is_one else fight.tp_two
                o_tp = fight.tp_two if my_is_one else fight.tp_one
                w_cp = fight.cp_one if my_is_one else fight.cp_two
                o_cp = fight.cp_two if my_is_one else fight.cp_one
                fight_event = session.get(SportEvent, fight.sport_event_id)
                fight_wc = session.get(WeightCategory, fight.weight_category_id) if fight.weight_category_id else None
                return {
                    "fight_id": fight.id,
                    "sport_event_name": fight_event.name if fight_event else None,
                    "discipline": f"{fight_wc.sport_name} - {fight_wc.audience_name}" if fight_wc and fight_wc.sport_name and fight_wc.audience_name else (fight_wc.sport_name if fight_wc else None),
                    "weight_category": fight_wc.name if fight_wc else None,
                    "wrestler_name": my_person_name,
                    "opponent_name": opp_person_name,
                    "wrestler_tp": w_tp,
                    "opponent_tp": o_tp,
                    "tp_diff": (w_tp or 0) - (o_tp or 0),
                    "wrestler_cp": w_cp,
                    "opponent_cp": o_cp,
                    "cp_diff": (w_cp or 0) - (o_cp or 0),
                    "victory_type": fight.victory_type,
                    "duration": fight.duration,
                    "won": fight.winner_id in my_athlete_ids if fight.winner_id else None,
                }

            def build_summary(fights_info):
                total = len(fights_info)
                if total == 0:
                    return {}
                wins = sum(1 for f in fights_info if f["won"] is True)
                losses = sum(1 for f in fights_info if f["won"] is False)
                avg_tp = round(sum(f["wrestler_tp"] or 0 for f in fights_info) / total, 1)
                avg_cp = round(sum(f["wrestler_cp"] or 0 for f in fights_info) / total, 1)
                avg_tp_diff = round(sum(f["tp_diff"] for f in fights_info) / total, 1)
                avg_cp_diff = round(sum(f["cp_diff"] for f in fights_info) / total, 1)
                # Count wins by victory type
                victory_types = {}
                for f in fights_info:
                    if f["won"] is True and f["victory_type"]:
                        vt = f["victory_type"]
                        victory_types[vt] = victory_types.get(vt, 0) + 1
                return {
                    "wins": wins,
                    "losses": losses,
                    "avg_tp": avg_tp,
                    "avg_cp": avg_cp,
                    "avg_tp_diff": avg_tp_diff,
                    "avg_cp_diff": avg_cp_diff,
                    "wins_by_type": victory_types,
                }

            # Person1 vs this opponent
            p1_vs_opp = session.exec(
                select(Fight).where(
                    or_(
                        and_(Fight.fighter_one_id.in_(p1_athlete_ids), Fight.fighter_two_id.in_(opp_athlete_ids)),
                        and_(Fight.fighter_one_id.in_(opp_athlete_ids), Fight.fighter_two_id.in_(p1_athlete_ids)),
                    )
                )
            ).all()

            # Person2 vs this opponent
            p2_vs_opp = session.exec(
                select(Fight).where(
                    or_(
                        and_(Fight.fighter_one_id.in_(p2_athlete_ids), Fight.fighter_two_id.in_(opp_athlete_ids)),
                        and_(Fight.fighter_one_id.in_(opp_athlete_ids), Fight.fighter_two_id.in_(p2_athlete_ids)),
                    )
                )
            ).all()

            p1_fights_info = [build_fight_info(f, set(p1_athlete_ids), person1.full_name, opp_person.full_name) for f in p1_vs_opp]
            p2_fights_info = [build_fight_info(f, set(p2_athlete_ids), person2.full_name, opp_person.full_name) for f in p2_vs_opp]

            common_opponents.append({
                "opponent": {"id": opp_person.id, "name": opp_person.full_name, "country": opp_person.country_iso_code},
                "person1_fights": p1_fights_info,
                "person1_summary": build_summary(p1_fights_info),
                "person2_fights": p2_fights_info,
                "person2_summary": build_summary(p2_fights_info),
            })

        result["common_opponents"] = common_opponents

    return result


@router.get("/{person_id}")
async def get_person_detail(person_id: int, session: Session = Depends(get_session)):
    """
    Get person detail with all their event participations
    """
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with id {person_id} not found"
        )

    # Get all athlete records for this person (one per event)
    athletes = session.exec(
        select(Athlete).where(Athlete.person_id == person_id)
    ).all()

    events = []
    for athlete in athletes:
        event = session.get(SportEvent, athlete.sport_event_id)
        team = session.get(Team, athlete.team_id) if athlete.team_id else None
        wc = session.get(WeightCategory, athlete.weight_category_id) if athlete.weight_category_id else None

        events.append({
            "athlete_id": athlete.id,
            "event_id": athlete.sport_event_id,
            "event_name": event.name if event else None,
            "team_name": team.name if team else None,
            "team_country": team.country_iso_code if team else None,
            "weight_category": wc.name if wc else None,
            "is_competing": athlete.is_competing,
        })

    return {
        "id": person.id,
        "full_name": person.full_name,
        "country_iso_code": person.country_iso_code,
        "created_at": person.created_at,
        "events": events,
    }


@router.get("/{person_id}/fights")
async def get_person_fights(person_id: int, session: Session = Depends(get_session)):
    """
    Get all fights for a person across all events
    """
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with id {person_id} not found"
        )

    # Get all athlete IDs for this person
    athlete_ids = [
        a.id for a in session.exec(
            select(Athlete).where(Athlete.person_id == person_id)
        ).all()
    ]

    if not athlete_ids:
        return {"person": person.full_name, "fights": []}

    # Find all fights where this person was fighter_one or fighter_two
    fights = session.exec(
        select(Fight).where(
            or_(
                Fight.fighter_one_id.in_(athlete_ids),
                Fight.fighter_two_id.in_(athlete_ids),
            )
        )
    ).all()

    fight_list = []
    for fight in fights:
        event = session.get(SportEvent, fight.sport_event_id)
        wc = session.get(WeightCategory, fight.weight_category_id) if fight.weight_category_id else None

        # Resolve opponent name via person
        if fight.fighter_one_id in athlete_ids:
            opponent_athlete = session.get(Athlete, fight.fighter_two_id) if fight.fighter_two_id else None
        else:
            opponent_athlete = session.get(Athlete, fight.fighter_one_id) if fight.fighter_one_id else None
        if opponent_athlete and opponent_athlete.person_id:
            opp_person = session.get(Person, opponent_athlete.person_id)
            opponent_name = opp_person.full_name if opp_person else None
        else:
            opponent_name = None

        is_winner = fight.winner_id in athlete_ids if fight.winner_id is not None else None

        fight_list.append({
            "fight_id": fight.id,
            "event_name": event.name if event else None,
            "weight_category": wc.name if wc else None,
            "opponent": opponent_name,
            "is_winner": is_winner,
            "victory_type": fight.victory_type,
            "tp_self": fight.tp_one if fight.fighter_one_id in athlete_ids else fight.tp_two,
            "tp_opponent": fight.tp_two if fight.fighter_one_id in athlete_ids else fight.tp_one,
            "cp_self": fight.cp_one if fight.fighter_one_id in athlete_ids else fight.cp_two,
            "cp_opponent": fight.cp_two if fight.fighter_one_id in athlete_ids else fight.cp_one,
        })

    return {
        "person": person.full_name,
        "country": person.country_iso_code,
        "total_fights": len(fight_list),
        "fights": fight_list,
    }
