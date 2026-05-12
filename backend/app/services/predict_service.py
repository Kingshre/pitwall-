"""
Race Prediction Service
Combines Elo ratings + qualifying position to predict race outcome
"""
import httpx
import asyncio
from app.services.cache_service import _get_client

OPENF1_BASE = "https://api.openf1.org/v1"


async def get_qualifying_results(session_key: int) -> list[dict]:
    """Fetch qualifying results from OpenF1 for a given session key."""
    async with httpx.AsyncClient(timeout=30) as http:
        drivers_resp = await http.get(
            f"{OPENF1_BASE}/drivers",
            params={"session_key": session_key}
        )
        drivers_resp.raise_for_status()
        drivers = drivers_resp.json()

        pos_resp = await http.get(
            f"{OPENF1_BASE}/position",
            params={"session_key": session_key}
        )
        pos_resp.raise_for_status()
        positions = pos_resp.json()

    driver_map = {
        d["driver_number"]: {
            "driver_number": d["driver_number"],
            "abbreviation": d.get("name_acronym", "---"),
            "full_name": d.get("full_name", "Unknown"),
            "team": d.get("team_name", "Unknown"),
            "team_colour": d.get("team_colour", "666666"),
        }
        for d in drivers
    }

    final_positions: dict[int, int] = {}
    for pos in positions:
        dn = pos.get("driver_number")
        p = pos.get("position")
        if dn and p:
            final_positions[dn] = p

    results = []
    for dn, info in driver_map.items():
        results.append({
            **info,
            "grid_position": final_positions.get(dn, 20),
        })

    return sorted(results, key=lambda x: x["grid_position"])


async def get_latest_elo_ratings(season: int = 2024) -> dict[str, float]:
    """Get the most recent Elo rating per driver from Supabase."""
    supabase = _get_client()
    if not supabase:
        return {}

    response = supabase.table("driver_elo") \
        .select("driver, elo, round") \
        .eq("season", season) \
        .order("round", desc=True) \
        .execute()

    latest: dict[str, float] = {}
    for row in response.data:
        driver = row["driver"]
        if driver not in latest:
            latest[driver] = row["elo"]

    return latest


def predict_race_outcome(
    qualifying: list[dict],
    elo_ratings: dict[str, float],
) -> list[dict]:
    n = len(qualifying)
    if n == 0:
        return []

    DEFAULT_ELO = 1490.0

    elos = [elo_ratings.get(d["abbreviation"], DEFAULT_ELO) for d in qualifying]
    min_elo = min(elos) if elos else DEFAULT_ELO
    max_elo = max(elos) if elos else DEFAULT_ELO + 100
    elo_range = max_elo - min_elo or 1

    results = []
    for driver in qualifying:
        abbr = driver["abbreviation"]
        grid = driver["grid_position"]
        elo = elo_ratings.get(abbr, DEFAULT_ELO)

        elo_score = ((elo - min_elo) / elo_range) * 100
        qual_score = ((n - grid) / (n - 1)) * 100 if n > 1 else 100
        combined = (elo_score * 0.60) + (qual_score * 0.40)

        results.append({
            **driver,
            "elo": round(elo, 1),
            "elo_score": round(elo_score, 1),
            "qual_score": round(qual_score, 1),
            "combined_score": round(combined, 1),
        })

    results.sort(key=lambda x: x["combined_score"], reverse=True)

    total_score = sum(r["combined_score"] for r in results) or 1
    for i, driver in enumerate(results):
        driver["predicted_position"] = i + 1
        driver["win_probability"] = round((driver["combined_score"] / total_score) * 100, 1)
        driver["position_change"] = driver["grid_position"] - driver["predicted_position"]
        driver["upset_alert"] = driver["position_change"] >= 3

    return results


async def run_prediction_v2(session_key: int, season: int = 2024) -> dict:
    """Full pipeline using asyncio.gather."""
    qualifying_task = asyncio.create_task(get_qualifying_results(session_key))
    elo_task = asyncio.create_task(get_latest_elo_ratings(season))

    qualifying, elo_ratings = await asyncio.gather(qualifying_task, elo_task)
    predictions = predict_race_outcome(qualifying, elo_ratings)

    return {
        "session_key": session_key,
        "season": season,
        "drivers_predicted": len(predictions),
        "predictions": predictions,
    }