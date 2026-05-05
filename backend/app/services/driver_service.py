"""
Driver DNA Service — computes per-driver performance fingerprints.
6 axes: qualifying pace, race pace, tire management, consistency, overtaking, wet weather.
All scores normalized to 0-100.
"""

import math
import fastf1
import pandas as pd
import numpy as np
from pathlib import Path
import os

CACHE_DIR = Path(os.getenv("FF1_CACHE_DIR", "/tmp/fastf1_cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))


def _sf(val, default=0.0):
    if val is None:
        return default
    try:
        v = float(val)
        return default if (math.isnan(v) or math.isinf(v)) else v
    except:
        return default


def _norm(value, min_val, max_val, invert=False):
    if max_val == min_val:
        return 50.0
    n = (value - min_val) / (max_val - min_val) * 100
    n = max(0.0, min(100.0, n))
    return round(100.0 - n if invert else n, 1)


def get_season_drivers(year: int) -> list[dict]:
    """Return all drivers who competed in a season."""
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    rounds = schedule[schedule["EventFormat"].isin(["conventional", "sprint_shootout"])]["RoundNumber"].tolist()
    if not rounds:
        return []

    # Load first race to get driver list
    session = fastf1.get_session(year, rounds[0], "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)
    laps = session.laps.copy()

    drivers = []
    for abbr in sorted(laps["Driver"].unique()):
        drv_laps = laps[laps["Driver"] == abbr]
        team = str(drv_laps.iloc[0].get("Team", "")) if len(drv_laps) > 0 else ""
        drivers.append({"driver": str(abbr), "team": team})
    return drivers


def get_driver_fingerprint(year: int, driver: str, max_rounds: int = 8) -> dict:
    """
    Compute DNA fingerprint for a driver across a season.
    Returns 6 normalized scores + raw stats.
    """
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    rounds = schedule[schedule["EventFormat"].isin(["conventional", "sprint_shootout"])]["RoundNumber"].tolist()
    rounds = rounds[:max_rounds]

    quali_deltas = []       # vs field median in quali
    race_pace_deltas = []   # vs field in race (positive = faster)
    deg_rates = []          # personal tire deg rate
    field_deg_rates = []    # field tire deg rate
    consistency_stds = []   # lap time std dev
    positions_gained = []   # grid pos - finish pos
    wet_pace = []
    dry_pace = []

    race_results = []

    for round_num in rounds:
        try:
            # ---- RACE ----
            race = fastf1.get_session(year, round_num, "R")
            race.load(laps=True, telemetry=False, weather=True, messages=False)
            laps = race.laps.copy()

            if driver not in laps["Driver"].values:
                continue

            laps = laps[laps["LapTime"].notna()]
            laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
            median_lt = _sf(laps["LapTimeSeconds"].median(), 90)
            clean = laps[
                (laps["LapTimeSeconds"] < median_lt * 1.07) &
                (laps["LapTimeSeconds"] > median_lt * 0.95)
            ]

            field_avg = _sf(clean["LapTimeSeconds"].mean(), median_lt)
            drv_clean = clean[clean["Driver"] == driver]

            if len(drv_clean) >= 5:
                drv_avg = _sf(drv_clean["LapTimeSeconds"].mean(), field_avg)
                delta = field_avg - drv_avg
                race_pace_deltas.append(delta)

                # Consistency
                std = _sf(drv_clean["LapTimeSeconds"].std(), 0)
                consistency_stds.append(std)

                # Tire degradation
                drv_with_compound = drv_clean[drv_clean["Compound"].notna() & drv_clean["TyreLife"].notna()]
                if len(drv_with_compound) >= 8:
                    x = drv_with_compound["TyreLife"].values.astype(float)
                    y = drv_with_compound["LapTimeSeconds"].values.astype(float)
                    if len(x) >= 4 and x.std() > 0:
                        coeffs = np.polyfit(x, y, 1)
                        deg_rates.append(float(coeffs[0]))

                # Field deg rate
                field_with_compound = clean[clean["Compound"].notna() & clean["TyreLife"].notna()]
                if len(field_with_compound) >= 10:
                    x2 = field_with_compound["TyreLife"].values.astype(float)
                    y2 = field_with_compound["LapTimeSeconds"].values.astype(float)
                    if len(x2) >= 4 and x2.std() > 0:
                        coeffs2 = np.polyfit(x2, y2, 1)
                        field_deg_rates.append(float(coeffs2[0]))

            # Positions gained
            drv_race_laps = laps[laps["Driver"] == driver]
            if len(drv_race_laps) > 0:
                first_lap = drv_race_laps[drv_race_laps["LapNumber"] == drv_race_laps["LapNumber"].min()]
                last_lap = drv_race_laps[drv_race_laps["LapNumber"] == drv_race_laps["LapNumber"].max()]
                if len(first_lap) > 0 and len(last_lap) > 0:
                    grid = first_lap.iloc[0].get("Position", None)
                    finish = last_lap.iloc[0].get("Position", None)
                    if grid and finish and pd.notna(grid) and pd.notna(finish):
                        positions_gained.append(float(grid) - float(finish))

            # Wet vs dry
            try:
                weather = race.weather_data
                if weather is not None and len(weather) > 0 and "Rainfall" in weather.columns:
                    is_wet = bool(weather["Rainfall"].any())
                    if len(drv_clean) >= 5:
                        pace = _sf(drv_clean["LapTimeSeconds"].mean()) - field_avg
                        if is_wet:
                            wet_pace.append(pace)
                        else:
                            dry_pace.append(pace)
            except:
                pass

        except Exception:
            continue

        try:
            # ---- QUALIFYING ----
            quali = fastf1.get_session(year, round_num, "Q")
            quali.load(laps=True, telemetry=False, weather=False, messages=False)
            qlaps = quali.laps.copy()
            qlaps = qlaps[qlaps["LapTime"].notna()]
            qlaps["LapTimeSeconds"] = qlaps["LapTime"].dt.total_seconds()

            # Best lap per driver
            best = qlaps.groupby("Driver")["LapTimeSeconds"].min()
            if driver in best.index and len(best) >= 3:
                field_best_median = _sf(best.median())
                drv_best = _sf(best[driver])
                quali_deltas.append(field_best_median - drv_best)  # positive = faster
        except Exception:
            pass