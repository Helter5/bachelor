"""
Arena seed script — vytvorí kompletný testovací event v Arena :8080.

Čo vytvorí:
  - 3 váhové kategórie (FS Seniors: 65kg, 74kg, 86kg)
  - 16 osôb (rôzne krajiny)
  - Tímy (1 per krajina)
  - Atlétov zaregistrovaných do eventu + priradených do váhoviek
  - Vygeneruje zápasy (draw)

Použitie:
  python tests/arena_seed_event.py

Prerekvizity:
  - Arena beží na localhost:8080
  - Event "Test Sync Cup" existuje v Arene (UUID z --event-id arg alebo env ARENA_EVENT_ID)
    Ak neposkytneš UUID, skript použije Multi-Arena Test Cup.
"""
import asyncio
import sys
import httpx

ARENA_BASE = "http://localhost:8080"
CLIENT_ID = "d1532eae14baf3ff798b6c7be8a8355f"
CLIENT_SECRET = "2356194b47bbcb3b8d2b6e5dc06831a60e1f8248d68b7ab4b2b549d181ec0075920b1883c81caa941c00648ebafac3d23dc56e6fdaa5919b000140503d670486"
API_KEY = "THxmuUTEdYHoLEGM8Y9xYTrCyFiPQvFFRp48KZXn3oQvevVdoH"

# Multi-Arena Test Cup — existuje vo všetkých troch Arena inštanciách
DEFAULT_EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-000000000001"

WEIGHT_CATEGORIES = [
    {"name": "65 kg", "sport": "fs", "audience": "seniors", "minWeight": 60, "maxWeight": 65,
     "roundsNumber": 2, "roundDuration": 180, "overtime": 120},
    {"name": "74 kg", "sport": "fs", "audience": "seniors", "minWeight": 66, "maxWeight": 74,
     "roundsNumber": 2, "roundDuration": 180, "overtime": 120},
    {"name": "86 kg", "sport": "fs", "audience": "seniors", "minWeight": 75, "maxWeight": 86,
     "roundsNumber": 2, "roundDuration": 180, "overtime": 120},
]

# 16 atlétov — 4 pre každú váhovku + 4 navyše pre 65kg (realistický bracket)
ATHLETES_DATA = [
    # 65 kg — 6 zápasníkov
    {"familyName": "NOVAK",    "givenName": "Jan",      "country": "SK", "wc_idx": 0},
    {"familyName": "KOVAC",    "givenName": "Peter",    "country": "SK", "wc_idx": 0},
    {"familyName": "MUELLER",  "givenName": "Hans",     "country": "DE", "wc_idx": 0},
    {"familyName": "SCHMIDT",  "givenName": "Klaus",    "country": "DE", "wc_idx": 0},
    {"familyName": "DUBOIS",   "givenName": "Pierre",   "country": "FR", "wc_idx": 0},
    {"familyName": "MARTIN",   "givenName": "Luca",     "country": "IT", "wc_idx": 0},
    # 74 kg — 5 zápasníkov
    {"familyName": "HORVATH",  "givenName": "Adam",     "country": "HU", "wc_idx": 1},
    {"familyName": "KOWALSKI", "givenName": "Piotr",    "country": "PL", "wc_idx": 1},
    {"familyName": "GARCIA",   "givenName": "Carlos",   "country": "ES", "wc_idx": 1},
    {"familyName": "JONES",    "givenName": "David",    "country": "GB", "wc_idx": 1},
    {"familyName": "BROWN",    "givenName": "Michael",  "country": "GB", "wc_idx": 1},
    # 86 kg — 5 zápasníkov
    {"familyName": "ROSSI",    "givenName": "Marco",    "country": "IT", "wc_idx": 2},
    {"familyName": "WEBER",    "givenName": "Thomas",   "country": "AT", "wc_idx": 2},
    {"familyName": "NAGY",     "givenName": "Gabor",    "country": "HU", "wc_idx": 2},
    {"familyName": "LOPEZ",    "givenName": "Miguel",   "country": "ES", "wc_idx": 2},
    {"familyName": "FISCHER",  "givenName": "Erik",     "country": "SE", "wc_idx": 2},
]


async def get_token(client: httpx.AsyncClient) -> str:
    resp = await client.post(
        f"{ARENA_BASE}/oauth/v2/token",
        params={
            "grant_type": "https://arena.uww.io/grants/api_key",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "api_key": API_KEY,
        }
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def create_person(client: httpx.AsyncClient, token: str, data: dict) -> str:
    family = data["familyName"]
    given = data["givenName"]
    display = f"{family} {given}"
    payload = {
        "familyName": family,
        "givenName": given,
        "preferedName": display,
        "displayName": display,
        "athenaPrintId": None,
        "customId": None,
        "odfCode": None,
        "preferredNames": {
            "printName": display,
            "isPrintNameChanged": False,
            "printInitialName": f"{family} {given[0]}.",
            "isPrintInitialNameChanged": False,
            "tvName": display,
            "isTVNameChanged": False,
            "tvInitialName": f"{family} {given[0]}.",
            "isTVInitialNameChanged": False,
            "tvFamilyName": family,
            "isTVFamilyNameChanged": False,
        }
    }
    resp = await client.post(f"{ARENA_BASE}/api/json/person/", json=payload, headers=auth(token))
    if resp.status_code != 201:
        print(f"  WARN person {display}: {resp.status_code} {resp.text[:200]}")
        return None
    # UUID je v Location headeri
    location = resp.headers.get("Location", "")
    person_id = location.split("/")[-1]
    print(f"  Person: {display} → {person_id}")
    return person_id


async def get_or_create_team(client: httpx.AsyncClient, token: str, event_id: str,
                              country: str, team_cache: dict) -> str | None:
    if country in team_cache:
        return team_cache[country]

    # Skontroluj existujúce tímy
    resp = await client.get(f"{ARENA_BASE}/api/json/team/{event_id}", headers=auth(token))
    teams = resp.json().get("sportEventTeams", {}).get("items", [])
    for t in teams:
        if t.get("teamAlternateName") == country or t.get("teamCountryAlternateName") == country:
            team_cache[country] = t["id"]
            return t["id"]

    # Vytvor nový tím
    resp = await client.post(
        f"{ARENA_BASE}/api/json/team/{event_id}",
        json={"country": country},
        headers=auth(token)
    )
    if resp.status_code in (200, 201):
        location = resp.headers.get("Location", "")
        tid = location.split("/")[-1]
        team_cache[country] = tid
        print(f"  Team: {country} → {tid}")
        return tid
    else:
        print(f"  WARN team {country}: {resp.status_code} {resp.text[:200]}")
        return None


async def register_athlete(client: httpx.AsyncClient, token: str,
                            event_id: str, person_id: str, team_id: str | None) -> str | None:
    payload = {"personId": person_id}
    if team_id:
        payload["sportEventTeamId"] = team_id

    resp = await client.post(
        f"{ARENA_BASE}/api/json/athlete/{event_id}",
        json=payload,
        headers=auth(token)
    )
    if resp.status_code != 201:
        print(f"  WARN athlete {person_id}: {resp.status_code} {resp.text[:200]}")
        return None
    location = resp.headers.get("Location", "")
    athlete_id = location.split("/")[-1]
    return athlete_id


async def create_weight_category(client: httpx.AsyncClient, token: str,
                                  event_id: str, wc: dict) -> str | None:
    payload = {
        "name": wc["name"],
        "sport": wc["sport"],
        "audience": wc["audience"],
        "minWeight": wc["minWeight"],
        "maxWeight": wc["maxWeight"],
        "roundsNumber": wc["roundsNumber"],
        "roundDuration": wc["roundDuration"],
        "overtime": wc["overtime"],
        "tournamentType": "singlebracket",
        "averageDuration": 0,
        "color": None,
    }
    resp = await client.post(
        f"{ARENA_BASE}/api/json/weight-category/{event_id}",
        json=payload,
        headers=auth(token)
    )
    if resp.status_code not in (200, 201):
        print(f"  WARN wc {wc['name']}: {resp.status_code} {resp.text[:300]}")
        return None
    location = resp.headers.get("Location", "")
    wc_id = location.split("/")[-1]
    print(f"  WC: {wc['name']} → {wc_id}")
    return wc_id


async def create_fighter(client: httpx.AsyncClient, token: str,
                          athlete_id: str, wc_id: str) -> bool:
    resp = await client.post(
        f"{ARENA_BASE}/api/json/fighter/{athlete_id}",
        json={"sportEventWeightCategory": wc_id},
        headers=auth(token)
    )
    if resp.status_code not in (200, 201):
        print(f"  WARN fighter {athlete_id} wc {wc_id}: {resp.status_code} {resp.text[:200]}")
        return False
    return True


async def generate_fights(client: httpx.AsyncClient, token: str,
                           event_id: str, wc_id: str, wc_name: str):
    resp = await client.post(
        f"{ARENA_BASE}/api/json/weight-category/get/{wc_id}/draw/auto",
        headers=auth(token)
    )
    if resp.status_code in (200, 201, 204):
        print(f"  Draw: {wc_name} ✓")
    else:
        # Skús manuálny draw
        resp2 = await client.post(
            f"{ARENA_BASE}/api/json/weight-category/get/{wc_id}/draw",
            headers=auth(token)
        )
        if resp2.status_code in (200, 201, 204):
            print(f"  Draw (manual): {wc_name} ✓")
        else:
            print(f"  WARN draw {wc_name}: {resp.status_code} {resp.text[:200]}")


async def seed(event_id: str = DEFAULT_EVENT_ID):
    print(f"\n[arena-seed] Event: {event_id}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_token(client)
        print("[arena-seed] Token OK")

        print("\n[arena-seed] === Váhové kategórie ===")

        def parse_wc_list(raw) -> list:
            if isinstance(raw, list):
                return raw
            if isinstance(raw, dict):
                val = raw.get("weightCategories", raw.get("items", []))
                if isinstance(val, dict):
                    return val.get("items", [])
                return val if isinstance(val, list) else []
            return []

        resp = await client.get(f"{ARENA_BASE}/api/json/weight-category/{event_id}", headers=auth(token))
        wc_name_to_id = {w["name"]: w["id"] for w in parse_wc_list(resp.json())}

        # Vytvor len WC ktoré ešte neexistujú
        for wc in WEIGHT_CATEGORIES:
            if wc["name"] in wc_name_to_id:
                print(f"  WC exists: {wc['name']} → {wc_name_to_id[wc['name']]}")
            else:
                wc_id = await create_weight_category(client, token, event_id, wc)
                if wc_id:
                    wc_name_to_id[wc["name"]] = wc_id

        wc_ids = [wc_name_to_id.get(wc["name"]) for wc in WEIGHT_CATEGORIES]
        print(f"  WC UUID map: { {wc['name']: wc_name_to_id.get(wc['name']) for wc in WEIGHT_CATEGORIES} }")

        print("\n[arena-seed] === Osoby / Atléti ===")

        for ath_data in ATHLETES_DATA:
            wc_idx = ath_data["wc_idx"]
            wc_id = wc_ids[wc_idx]
            if not wc_id:
                print(f"  SKIP {ath_data['familyName']} — WC ID chýba")
                continue

            person_id = await create_person(client, token, ath_data)
            if not person_id:
                continue

            athlete_id = await register_athlete(client, token, event_id, person_id, None)
            if not athlete_id:
                continue

            ok = await create_fighter(client, token, athlete_id, wc_id)
            wc_name = WEIGHT_CATEGORIES[wc_idx]["name"]
            print(f"  Fighter: {ath_data['familyName']} {ath_data['givenName']} → {wc_name} {'✓' if ok else '✗'}")

        print("\n[arena-seed] === Draw / Generovanie zápasov ===")
        for i, wc in enumerate(WEIGHT_CATEGORIES):
            wc_id = wc_ids[i]
            if wc_id:
                await generate_fights(client, token, event_id, wc_id, wc["name"])

    print("\n[arena-seed] Hotovo!")


if __name__ == "__main__":
    event_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EVENT_ID
    asyncio.run(seed(event_id))
