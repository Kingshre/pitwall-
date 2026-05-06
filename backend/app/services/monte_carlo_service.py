"""
Monte Carlo Championship Simulation
Uses Elo ratings + historical finishing distributions to simulate remaining races.
50k simulations → title probability with confidence intervals.
"""

import math
import numpy as np
from collections import defaultdict
from app.services.cache_service import _get_client
from app.services import elo_service

POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
MAX_PTS_PER_RACE = 26


def get_current_standings(year: int) -> list[dict]:
    """Get current points standings from race_results."""
    client = _get_client()
    if not client:
        return []

    res = client.table("race_results") \
        .select("driver, team, points") \
        .eq("season", year) \
        .execute()

    standings = defaultdict(lambda: {"points": 0.0, "team": ""})
    for row in res.data:
        d = row["driver"]
        standings[d]["points"] += row["points"]
        standings[d]["team"] = row["team"]

    result = [
        {"driver": d, "team": v["team"], "points": round(v["points"], 1)}
        for d, v in standings.items()
    ]
    return sorted(result, key=lambda x: x["points"], reverse=True)


def get_historical_dnf_rates(year: int) -> dict[str, float]:
    """Compute per-driver DNF rate from historical data."""
    client = _get_client()
    if not client:
        return {}

    res = client.table("race_results") \
        .select("driver, dnf") \
        .eq("season", year) \
        .execute()

    counts = defaultdict(lambda: {"total": 0, "dnfs": 0})
    for row in res.data:
        d = row["driver"]
        counts[d]["total"] += 1
        if row["dnf"]:
            counts[d]["dnfs"] += 1

    return {
        d: v["dnfs"] / v["total"] if v["total"] > 0 else 0.1
        for d, v in counts.items()
    }


def get_remaining_races(year: int) -> int:
    """Estimate remaining races in a season."""
    import fastf1
    from datetime import date
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        today = date.today()
        remaining = schedule[
            (schedule["EventFormat"].isin(["conventional", "sprint_shootout"])) &
            (schedule["EventDate"].dt.date > today)
        ]
        return len(remaining)
    except Exception:
        return 0


def simulate_championship(year: int, n_simulations: int = 50000) -> dict:
    """
    Monte Carlo championship simulation.

    Algorithm:
    1. Get current standings + Elo ratings
    2. Convert Elo → win probability via softmax
    3. For each simulation, draw finishing orders probabilistically
    4. Award points, crown champion
    5. Return probability distribution with confidence intervals
    """
    standings = get_current_standings(year)
    if not standings:
        return {"error": f"No standings data for {year}"}

    elo_ratings = elo_service.get_current_elos(year)
    dnf_rates = get_historical_dnf_rates(year)
    n_remaining = get_remaining_races(year)

    drivers = [s["driver"] for s in standings]
    current_pts = np.array([s["points"] for s in standings], dtype=float)
    n_drivers = len(drivers)

    if n_remaining == 0:
        winner_idx = int(np.argmax(current_pts))
        return {
            "year": year,
            "season_complete": True,
            "champion": drivers[winner_idx],
            "simulations": 0,
            "remaining_races": 0,
            "results": [
                {
                    **standings[i],
                    "probability": 1.0 if i == 0 else 0.0,
                    "avg_final_points": standings[i]["points"],
                    "p10_points": standings[i]["points"],
                    "p90_points": standings[i]["points"],
                    "points_gap": round(standings[0]["points"] - standings[i]["points"], 1),
                }
                for i in range(n_drivers)
            ]
        }

    elos = np.array([elo_ratings.get(d, 1500.0) for d in drivers], dtype=float)

    temperature = 200.0
    elo_exp = np.exp((elos - elos.mean()) / temperature)
    win_probs = elo_exp / elo_exp.sum()

    dnf_probs = np.array([dnf_rates.get(d, 0.05) for d in drivers], dtype=float)

    rng = np.random.default_rng(42)
    title_counts = np.zeros(n_drivers, dtype=int)
    final_pts_all = np.zeros((n_simulations, n_drivers), dtype=float)

    for sim in range(n_simulations):
        sim_pts = current_pts.copy()

        for _race in range(n_remaining):
            dnf_mask = rng.random(n_drivers) < dnf_probs
            active_drivers = np.where(~dnf_mask)[0]

            if len(active_drivers) == 0:
                continue

            active_probs = win_probs[active_drivers]
            active_probs = active_probs / active_probs.sum()

            remaining_idx = list(active_drivers)
            remaining_probs = list(active_probs)
            finish_order = []

            for _ in range(len(active_drivers)):
                probs = np.array(remaining_probs)
                probs = probs / probs.sum()
                chosen = rng.choice(len(remaining_idx), p=probs)
                finish_order.append(remaining_idx[chosen])
                remaining_idx.pop(chosen)
                remaining_probs.pop(chosen)

            for pos, driver_idx in enumerate(finish_order):
                if pos < len(POINTS_TABLE):
                    sim_pts[driver_idx] += POINTS_TABLE[pos]
                if pos < 10 and rng.random() < 0.1:
                    sim_pts[driver_idx] += 1

        final_pts_all[sim] = sim_pts
        title_counts[np.argmax(sim_pts)] += 1

    probabilities = title_counts / n_simulations
    avg_pts = final_pts_all.mean(axis=0)
    p10_pts = np.percentile(final_pts_all, 10, axis=0)
    p90_pts = np.percentile(final_pts_all, 90, axis=0)

    results = []
    for i, s in enumerate(standings):
        results.append({
            **s,
            "elo": round(float(elos[i]), 1),
            "probability": round(float(probabilities[i]), 4),
            "avg_final_points": round(float(avg_pts[i]), 1),
            "p10_points": round(float(p10_pts[i]), 1),
            "p90_points": round(float(p90_pts[i]), 1),
            "points_gap": round(float(current_pts[0] - current_pts[i]), 1),
            "max_possible": round(float(current_pts[i]) + n_remaining * MAX_PTS_PER_RACE, 1),
            "mathematically_alive": float(current_pts[i]) + n_remaining * MAX_PTS_PER_RACE >= float(current_pts[0]),
        })

    results.sort(key=lambda x: x["probability"], reverse=True)

    try:
        client = _get_client()
        if client:
            client.table("championship_sim").upsert({
                "key": f"championship_sim:{year}",
                "data": {
                    "results": results,
                    "metadata": {
                        "simulations": n_simulations,
                        "remaining_races": n_remaining,
                        "year": year,
                    }
                }
            }).execute()
    except Exception:
        pass

    return {
        "year": year,
        "season_complete": False,
        "simulations": n_simulations,
        "remaining_races": n_remaining,
        "results": results,
    }