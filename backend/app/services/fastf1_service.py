"""
FastF1 Service — wraps fastf1 library with caching and clean data shapes.
All NaN/numpy types are sanitized before returning.
"""

import os
import math
import fastf1
import pandas as pd
import numpy as np
from pathlib import Path

CACHE_DIR = Path(os.getenv("FF1_CACHE_DIR", "/tmp/fastf1_cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

TIRE_COLORS = {
    "SOFT": "#E8002D",
    "MEDIUM": "#FFF200",
    "HARD": "#EBEBEB",
    "INTERMEDIATE": "#39B54A",
    "WET": "#0067FF",
    "UNKNOWN": "#999999",
}


def _c(val, default=None):
    """Convert any NaN/Inf/numpy scalar to a JSON-safe Python type."""
    if val is None:
        return default
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        v = float(val)
        return default if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, str):
        return val
    return val


def get_season_races(year: int) -> list[dict]:
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    races = []
    for _, row in schedule.iterrows():
        if row["EventFormat"] in ("conventional", "sprint_shootout"):
            races.append({
                "round": int(row["RoundNumber"]),
                "name": str(row["EventName"]),
                "location": str(row["Location"]),
                "country": str(row["Country"]),
                "date": str(row["EventDate"].date()) if pd.notna(row["EventDate"]) else None,
                "circuit": str(row.get("OfficialEventName", row["EventName"])),
            })
    return races


def get_race_session(year: int, round_number: int):
    session = fastf1.get_session(year, round_number, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)
    return session


def get_lap_data(year: int, round_number: int) -> dict:
    session = get_race_session(year, round_number)
    laps = session.laps.copy()

    laps = laps[laps["LapTime"].notna()]
    laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
    laps["PitOutFlag"] = laps["PitOutTime"].notna()
    laps["PitInFlag"] = laps["PitInTime"].notna()

    drivers_data = []
    for driver_abbr in laps["Driver"].unique():
        drv_laps = laps[laps["Driver"] == driver_abbr].copy()
        drv_laps = drv_laps.sort_values("LapNumber")

        stints = []
        for _, lap in drv_laps.iterrows():
            compound = lap.get("Compound", "UNKNOWN")
            if not isinstance(compound, str) or pd.isna(compound):
                compound = "UNKNOWN"

            pos_val = lap["Position"]
            pos = int(pos_val) if pd.notna(pos_val) else None

            stints.append({
                "lap": int(lap["LapNumber"]),
                "lap_time": round(float(lap["LapTimeSeconds"]), 3),
                "compound": compound,
                "tyre_life": int(_c(lap.get("TyreLife", 0), 0)),
                "stint": int(_c(lap.get("Stint", 1), 1)),
                "pit_in": bool(lap["PitInFlag"]),
                "pit_out": bool(lap["PitOutFlag"]),
                "position": pos,
                "is_personal_best": bool(_c(lap.get("IsPersonalBest", False), False)),
            })

        pit_laps = drv_laps[drv_laps["PitInFlag"] == True]["LapNumber"].tolist()
        team_val = drv_laps.iloc[0].get("Team", "")
        team = str(team_val) if (team_val and not (isinstance(team_val, float) and math.isnan(team_val))) else ""

        drivers_data.append({
            "driver": str(driver_abbr),
            "team": team,
            "laps": stints,
            "pit_laps": [int(p) for p in pit_laps],
            "total_laps": len(stints),
            "compounds_used": list(drv_laps["Compound"].dropna().unique()),
        })

    return {
        "year": year,
        "round": round_number,
        "race_name": str(session.event["EventName"]),
        "circuit": str(session.event["Location"]),
        "total_laps": int(laps["LapNumber"].max()),
        "drivers": drivers_data,
    }


def get_tire_degradation(year: int, round_number: int) -> dict:
    session = get_race_session(year, round_number)
    laps = session.laps.copy()
    laps = laps[laps["LapTime"].notna() & laps["Compound"].notna()]
    laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()

    median_lt = laps["LapTimeSeconds"].median()
    laps = laps[laps["LapTimeSeconds"] < median_lt * 1.07]
    laps = laps[laps["LapTimeSeconds"] > median_lt * 0.95]

    compounds = laps["Compound"].unique()
    degradation = {}

    for compound in compounds:
        c_laps = laps[laps["Compound"] == compound]
        if len(c_laps) < 5:
            continue
        by_age = c_laps.groupby("TyreLife")["LapTimeSeconds"].agg(["mean", "std", "count"])
        by_age = by_age[by_age["count"] >= 3]

        if len(by_age) >= 4:
            x = by_age.index.values.astype(float)
            y = by_age["mean"].values.astype(float)
            coeffs = np.polyfit(x, y, 1)
            deg_rate = round(float(coeffs[0]), 4)
            base_time = round(float(coeffs[1]), 3)
        else:
            deg_rate = 0.0
            base_time = float(by_age["mean"].mean())

        data_pts = []
        for age, row in by_age.iterrows():
            std_val = float(row["std"])
            data_pts.append({
                "tyre_age": int(age),
                "avg_lap_time": round(float(row["mean"]), 3),
                "std": round(std_val, 3) if not math.isnan(std_val) else 0.0,
                "count": int(row["count"]),
            })

        degradation[str(compound)] = {
            "color": TIRE_COLORS.get(str(compound), "#999"),
            "deg_rate": deg_rate,
            "base_time": base_time,
            "data": data_pts,
        }

    return {
        "year": year,
        "round": round_number,
        "compounds": degradation,
    }


def get_strategy_analysis(year: int, round_number: int) -> dict:
    session = get_race_session(year, round_number)
    laps = session.laps.copy()
    laps = laps[laps["LapTime"].notna()]
    laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
    laps = laps.sort_values(["Driver", "LapNumber"])
    laps["CumTime"] = laps.groupby("Driver")["LapTimeSeconds"].cumsum()

    pit_stops = []
    for driver in laps["Driver"].unique():
        drv = laps[laps["Driver"] == driver]
        pit_laps = drv[drv["PitInTime"].notna()]
        for _, pit in pit_laps.iterrows():
            pit_stops.append({
                "driver": str(driver),
                "lap": int(pit["LapNumber"]),
                "duration": 22.0,
            })

    undercut_windows = []
    for lap_num, lap_group in laps.groupby("LapNumber"):
        lap_group = lap_group.sort_values("Position")
        rows = list(lap_group.iterrows())
        for i in range(1, len(rows)):
            _, row = rows[i]
            _, prev_row = rows[i - 1]
            if pd.isna(row["CumTime"]) or pd.isna(prev_row["CumTime"]):
                continue
            gap = float(row["CumTime"]) - float(prev_row["CumTime"])
            if 0 < gap < 25:
                undercut_windows.append({
                    "lap": int(lap_num),
                    "driver": str(row["Driver"]),
                    "driver_ahead": str(prev_row["Driver"]),
                    "gap": round(gap, 2),
                    "undercut_viable": gap < 22,
                })

    return {
        "year": year,
        "round": round_number,
        "pit_stops": pit_stops,
        "undercut_windows": undercut_windows[:200],
    }