"""
Data Ingestion Service
Pulls historical race results from FastF1 and stores in Supabase race_results table.
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

        # Check if already ingested with real data
        existing = client.table("race_results") \
            .select("finish_position") \
            .eq("season", year) \
            .eq("round", round_num) \
            .limit(1) \
            .execute()

        if existing.data and existing.data[0]["finish_position"] != 20:
            skipped.append(round_num)
            continue

        # Delete any bad existing data
        client.table("race_results") \
            .delete() \
            .eq("season", year) \
            .eq("round", round_num) \
            .execute()

        try:
            session = fastf1.get_session(year, round_num, "R")
            session.load(laps=True, telemetry=False, weather=False, messages=False)
            
            laps = session.laps.copy()
            if laps is None or len(laps) == 0:
                skipped.append(round_num)
                continue

            # Get final position from last lap per driver
            laps["LapNumber"] = pd.to_numeric(laps["LapNumber"], errors="coerce")
            last_laps = laps.sort_values("LapNumber").groupby("Driver").last().reset_index()

            rows = []
            for _, row in last_laps.iterrows():
                driver = str(row["Driver"])
                team = str(row.get("Team", "Unknown"))
                pos = row.get("Position")
                finish_pos = int(_sf(pos, 20)) if pd.notna(pos) else 20

                # Grid position from first lap
                first_lap = laps[laps["Driver"] == driver].sort_values("LapNumber").iloc[0]
                grid = first_lap.get("Position", 20)
                grid_pos = int(_sf(grid, 20)) if pd.notna(grid) else 20

                pts = POINTS_TABLE[finish_pos - 1] if 1 <= finish_pos <= 10 else 0

                rows.append({
                    "season": year,
                    "round": round_num,
                    "race_name": str(race_name),
                    "driver": driver,
                    "team": team,
                    "finish_position": finish_pos,
                    "grid_position": grid_pos,
                    "points": float(pts),
                    "dnf": False,
                    "dnf_reason": None,
                    "fastest_lap": False,
                })

            if rows:
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
    results = {}
    for year in range(start, end + 1):
        print(f"\nIngesting {year}...")
        results[year] = ingest_season(year)
    return results