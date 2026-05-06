"""
Data Ingestion Service
Pulls historical race results from FastF1 and stores in Supabase race_results table.
Run once per season to populate the database.
"""

import math
import fastf1
import pandas as pd
import numpy as np
from pathlib import Path
import os
from app.services.cache_service import _get_client

CACHE_DIR = Path(os.getenv("FF1_CACHE_DIR", "/tmp/fastf1_cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]


def _sf(val, default=None):
    if val is None:
        return default
    try:
        v = float(val)
        return default if (math.isnan(v) or math.isinf(v)) else v
    except:
        return default


def ingest_season(year: int) -> dict:
    """
    Pull all race results for a season and upsert into race_results table.
    Returns summary of what was ingested.
    """
    client = _get_client()
    if not client:
        return {"error": "Supabase not configured"}

    schedule = fastf1.get_event_schedule(year, include_testing=False)
    rounds = schedule[
        schedule["EventFormat"].isin(["conventional", "sprint_shootout"])
    ][["RoundNumber", "EventName"]].values.tolist()

    ingested = []
    skipped = []

    for round_num, race_name in rounds:
        round_num = int(round_num)

        # Check if already ingested
        existing = client.table("race_results") \
            .select("id") \
            .eq("season", year) \
            .eq("round", round_num) \
            .limit(1) \
            .execute()

        if existing.data:
            skipped.append(round_num)
            continue

        try:
            session = fastf1.get_session(year, round_num, "R")
            session.load(laps=False, telemetry=False, weather=False, messages=False)
            results = session.results

            if results is None or len(results) == 0:
                skipped.append(round_num)
                continue

            rows = []
            for _, row in results.iterrows():
                driver = str(row.get("Abbreviation", "???"))
                team = str(row.get("TeamName", "Unknown"))
                pos = row.get("Position")
                grid = row.get("GridPosition")
                status = str(row.get("Status", ""))
                fl = bool(row.get("FastestLap", False))

                finish_pos = int(_sf(pos, 20)) if pd.notna(pos) else 20
                grid_pos = int(_sf(grid, 20)) if pd.notna(grid) else 20

                dnf = status.lower() not in ("finished", "+1 lap", "+2 laps", "+3 laps", "+4 laps", "+5 laps")
                pts = POINTS_TABLE[finish_pos - 1] if finish_pos <= 10 else 0
                if fl and finish_pos <= 10:
                    pts += 1

                rows.append({
                    "season": year,
                    "round": round_num,
                    "race_name": str(race_name),
                    "driver": driver,
                    "team": team,
                    "finish_position": finish_pos,
                    "grid_position": grid_pos,
                    "points": float(pts),
                    "dnf": dnf,
                    "dnf_reason": status if dnf else None,
                    "fastest_lap": fl,
                })

            client.table("race_results").insert(rows).execute()
            ingested.append(round_num)
            print(f"  ✓ {year} R{round_num} {race_name} — {len(rows)} drivers")

        except Exception as e:
            print(f"  ✗ {year} R{round_num} — {e}")
            skipped.append(round_num)
            continue

    return {
        "year": year,
        "ingested_rounds": ingested,
        "skipped_rounds": skipped,
        "total_ingested": len(ingested),
    }


def ingest_all_seasons(start: int = 2018, end: int = 2024) -> dict:
    """Ingest all seasons from start to end."""
    results = {}
    for year in range(start, end + 1):
        print(f"\nIngesting {year}...")
        results[year] = ingest_season(year)
    return results