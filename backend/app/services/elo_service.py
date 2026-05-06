"""
Elo Rating System for F1 Drivers
- Each driver starts at 1500
- K-factor adjusts based on experience (higher K for newer drivers)
- Expected score based on pairwise comparisons across full grid
- Ratings persist in Supabase driver_elo table
"""

import math
from app.services.cache_service import _get_client

BASE_ELO = 1500.0
K_FACTOR = 32.0
K_FACTOR_NEW = 48.0  # higher for drivers with < 30 races
DNF_PENALTY = 0.1    # DNFs count as a partial loss vs finishers


def expected_score(rating_a: float, rating_b: float) -> float:
    """Standard Elo expected score for player A vs player B."""
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def update_elo(rating: float, expected: float, actual: float, k: float) -> float:
    return round(rating + k * (actual - expected), 4)


def compute_actual_score(pos_a: int, pos_b: int, dnf_a: bool, dnf_b: bool) -> float:
    """
    Head-to-head score for driver A vs driver B.
    1.0 = A beat B, 0.0 = B beat A, 0.5 = tie
    DNF is treated as a near-loss even if position is ahead.
    """
    if dnf_a and not dnf_b:
        return DNF_PENALTY
    if dnf_b and not dnf_a:
        return 1.0 - DNF_PENALTY
    if pos_a < pos_b:
        return 1.0
    if pos_a > pos_b:
        return 0.0
    return 0.5


def compute_season_elos(year: int, force: bool = False) -> dict:
    """
    Compute Elo ratings for all drivers across a season.
    Processes races in order, updating ratings after each race.
    Stores snapshots in driver_elo table.
    """
    client = _get_client()
    if not client:
        return {"error": "Supabase not configured"}

    # Check if already computed
    if not force:
        existing = client.table("driver_elo") \
            .select("id") \
            .eq("season", year) \
            .limit(1) \
            .execute()
        if existing.data:
            return {"status": "already computed", "year": year}

    # Load all race results for this season
    res = client.table("race_results") \
        .select("*") \
        .eq("season", year) \
        .order("round") \
        .execute()

    if not res.data:
        return {"error": f"No race results found for {year}"}

    # Load previous season's final Elos as starting point
    prev_elos = _get_previous_season_elos(year - 1) if year > 2018 else {}

    # Current ratings — start from prev season or BASE_ELO
    ratings: dict[str, float] = {}
    race_counts: dict[str, int] = {}
    elo_snapshots = []

    # Group results by round
    rounds: dict[int, list] = {}
    for row in res.data:
        r = row["round"]
        if r not in rounds:
            rounds[r] = []
        rounds[r].append(row)

    for round_num in sorted(rounds.keys()):
        race_rows = rounds[round_num]
        race_name = race_rows[0]["race_name"] if race_rows else ""

        # Initialize any new drivers
        for row in race_rows:
            d = row["driver"]
            if d not in ratings:
                # Carry over from previous season with regression to mean
                if d in prev_elos:
                    ratings[d] = _regress_to_mean(prev_elos[d])
                else:
                    ratings[d] = BASE_ELO
                race_counts[d] = 0

        # Run pairwise Elo updates
        new_ratings = {d: v for d, v in ratings.items()}


        drivers_in_race = [(row["driver"], row["finish_position"], row["dnf"]) for row in race_rows]

        for i, (drv_a, pos_a, dnf_a) in enumerate(drivers_in_race):
            delta = 0.0
            for j, (drv_b, pos_b, dnf_b) in enumerate(drivers_in_race):
                if i == j:
                    continue
                exp = expected_score(ratings[drv_a], ratings[drv_b])
                actual = compute_actual_score(pos_a, pos_b, dnf_a, dnf_b)
                k = K_FACTOR_NEW if race_counts.get(drv_a, 0) < 30 else K_FACTOR
                delta += k * (actual - exp)

            # Normalize delta by number of comparisons
            n_comparisons = len(drivers_in_race) - 1
            if n_comparisons > 0:
                new_ratings[drv_a] = round(ratings[drv_a] + delta / n_comparisons, 4)

        # Update ratings and race counts
        for row in race_rows:
            d = row["driver"]
            ratings[d] = new_ratings[d]
            race_counts[d] = race_counts.get(d, 0) + 1

            elo_snapshots.append({
                "season": year,
                "round": round_num,
                "driver": d,
                "elo": ratings[d],
            })

    # Delete existing and reinsert
    client.table("driver_elo").delete().eq("season", year).execute()
    
    # Insert in batches of 100
    for i in range(0, len(elo_snapshots), 100):
        client.table("driver_elo").insert(elo_snapshots[i:i+100]).execute()

    return {
        "year": year,
        "drivers_rated": len(ratings),
        "rounds_processed": len(rounds),
        "final_ratings": dict(sorted(ratings.items(), key=lambda x: x[1], reverse=True)),
    }


def get_current_elos(year: int) -> dict[str, float]:
    """Get the most recent Elo rating for each driver in a season."""
    client = _get_client()
    if not client:
        return {}

    res = client.table("driver_elo") \
        .select("driver, elo, round") \
        .eq("season", year) \
        .order("round", desc=True) \
        .execute()

    # Keep only the latest rating per driver
    seen = set()
    ratings = {}
    for row in res.data:
        d = row["driver"]
        if d not in seen:
            ratings[d] = row["elo"]
            seen.add(d)

    return ratings


def get_elo_history(year: int) -> dict:
    """Get full Elo history for all drivers across a season."""
    client = _get_client()
    if not client:
        return {}

    res = client.table("driver_elo") \
        .select("*") \
        .eq("season", year) \
        .order("round") \
        .execute()

    history: dict[str, list] = {}
    for row in res.data:
        d = row["driver"]
        if d not in history:
            history[d] = []
        history[d].append({"round": row["round"], "elo": row["elo"]})

    return history


def _get_previous_season_elos(year: int) -> dict[str, float]:
    """Get final Elo ratings from end of a season."""
    client = _get_client()
    if not client:
        return {}
    try:
        return get_current_elos(year)
    except Exception:
        return {}


def _regress_to_mean(elo: float, factor: float = 0.3) -> float:
    """Regress Elo toward mean between seasons — prevents runaway ratings."""
    return round(elo + factor * (BASE_ELO - elo), 4)