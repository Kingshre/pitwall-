"""
Race Prediction Service
Combines Elo ratings + qualifying position to predict race outcome
"""
import httpx
import asyncio
from typing import Optional
from app.services.cache_service import get_supabase

OPENF1_BASE = "https://api.openf1.org/v1"


async def get_qualifying_results(session_key: int) -> list[dict]:
    """Fetch qualifying results from OpenF1 for a given session key."""
    # OpenF1 qualifying uses position data from the qualifying session
    async with httpx.AsyncClient(timeout=30) as http:
        # Get drivers in this session
        drivers_resp = await http.get(
            f"{OPENF1_BASE}/drivers",
            params={"session_key": session_key}
        )
        drivers_resp.raise_for_status()
        drivers = drivers_resp.json()

        # Get position data (lap times / qualifying positions)
        pos_resp = await http.get(
            f"{OPENF1_BASE}/position",
            params={"session_key": session_key}
        )
        pos_resp.raise_for_status()
        positions = pos_resp.json()

    # Build driver map
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

    # Get final qualifying position per driver (last recorded position)
    final_positions: dict[int, int] = {}
    for pos in positions:
        dn = pos.get("driver_number")
        p = pos.get("position")
        if dn and p:
            final_positions[dn] = p

    # Combine
    results = []
    for dn, info in driver_map.items():
        results.append({
            **info,
            "grid_position": final_positions.get(dn, 20),
        })

    return sorted(results, key=lambda x: x["grid_position"])


async def get_latest_elo_ratings(season: int = 2024) -> dict[str, float]:
    """Get the most recent Elo rating per driver from Supabase."""
    supabase = get_supabase()

    # Get max round for the season
    response = supabase.table("driver_elo") \
        .select("driver, elo, round") \
        .eq("season", season) \
        .order("round", desc=True) \
        .execute()

    # Keep only the latest round entry per driver
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
    """
    Predict race finishing order.

    Score formula:
    - Elo rating (normalized 0-100): 60% weight
    - Qualifying position (inverted, normalized): 40% weight

    Higher score = better predicted finish
    """
    n = len(qualifying)
    if n == 0:
        return []

    DEFAULT_ELO = 1490.0

    # Get elo range for normalization
    elos = [elo_ratings.get(d["abbreviation"], DEFAULT_ELO) for d in qualifying]
    min_elo = min(elos) if elos else DEFAULT_ELO
    max_elo = max(elos) if elos else DEFAULT_ELO + 100
    elo_range = max_elo - min_elo or 1

    results = []
    for driver in qualifying:
        abbr = driver["abbreviation"]
        grid = driver["grid_position"]
        elo = elo_ratings.get(abbr, DEFAULT_ELO)

        # Normalize elo to 0-100
        elo_score = ((elo - min_elo) / elo_range) * 100

        # Qualifying score: P1 = 100, P20 = 0
        qual_score = ((n - grid) / (n - 1)) * 100 if n > 1 else 100

        # Combined score
        combined = (elo_score * 0.60) + (qual_score * 0.40)

        results.append({
            **driver,
            "elo": round(elo, 1),
            "elo_score": round(elo_score, 1),
            "qual_score": round(qual_score, 1),
            "combined_score": round(combined, 1),
        })

    # Sort by combined score descending → predicted finish order
    results.sort(key=lambda x: x["combined_score"], reverse=True)

    # Assign predicted positions + win probability
    total_score = sum(r["combined_score"] for r in results) or 1
    for i, driver in enumerate(results):
        driver["predicted_position"] = i + 1
        driver["win_probability"] = round((driver["combined_score"] / total_score) * 100, 1)
        driver["position_change"] = driver["grid_position"] - driver["predicted_position"]
        # Upset alert: gaining 3+ places vs grid
        driver["upset_alert"] = driver["position_change"] >= 3

    return results


async def run_prediction(session_key: int, season: int = 2024) -> dict:
    """Full pipeline: qualifying + elo + predict."""
    qualifying, elo_ratings = await asyncio.gather(
        get_qualifying_results(session_key),
        asyncio.get_event_loop().run_in_executor(
            None, lambda: asyncio.run(get_latest_elo_ratings_sync(season))
        )
    )
    predictions = predict_race_outcome(qualifying, elo_ratings)
    return {
        "session_key": session_key,
        "season": season,
        "drivers_predicted": len(predictions),
        "predictions": predictions,
    }


async def get_latest_elo_ratings_sync(season: int) -> dict[str, float]:
    return await get_latest_elo_ratings(season)


async def run_prediction_v2(session_key: int, season: int = 2024) -> dict:
    """Full pipeline using asyncio.gather properly."""
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