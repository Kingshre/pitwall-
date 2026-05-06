"""
OpenF1 Service — fetches live and recent race data from api.openf1.org
No API key required.
"""

import httpx
from datetime import datetime, timezone

BASE = "https://api.openf1.org/v1"


async def _get(endpoint: str, params: dict = {}) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{BASE}/{endpoint}", params=params)
        res.raise_for_status()
        return res.json()


async def get_current_session() -> dict | None:
    """Get the currently active or most recent session."""
    now = datetime.now(timezone.utc).isoformat()
    sessions = await _get("sessions", {"year": 2026, "session_type": "Race"})
    if not sessions:
        return None

    # Find active session (started but not ended)
    for s in sessions:
        start = s.get("date_start", "")
        end = s.get("date_end", "")
        if start <= now <= end and not s.get("is_cancelled"):
            s["is_live"] = True
            return s

    # Fall back to most recent completed
    completed = [s for s in sessions if s.get("date_end", "") < now and not s.get("is_cancelled")]
    if completed:
        latest = max(completed, key=lambda x: x["date_end"])
        latest["is_live"] = False
        return latest

    return None


async def get_session_drivers(session_key: int) -> list:
    """Get all drivers for a session with team colors."""
    return await _get("drivers", {"session_key": session_key})


async def get_latest_positions(session_key: int) -> list:
    """Get the latest position for each driver."""
    data = await _get("position", {"session_key": session_key})
    # Keep only latest position per driver
    latest = {}
    for row in data:
        drv = row["driver_number"]
        if drv not in latest or row["date"] > latest[drv]["date"]:
            latest[drv] = row
    return sorted(latest.values(), key=lambda x: x["position"])


async def get_latest_laps(session_key: int) -> list:
    """Get the most recent lap for each driver."""
    data = await _get("laps", {"session_key": session_key})
    latest = {}
    for row in data:
        drv = row["driver_number"]
        if drv not in latest or row["lap_number"] > latest[drv]["lap_number"]:
            latest[drv] = row
    return list(latest.values())


async def get_stints(session_key: int) -> list:
    """Get current tire stints for each driver."""
    return await _get("stints", {"session_key": session_key})


async def get_race_state(session_key: int) -> dict:
    """
    Assemble full race state — positions + lap times + tire compounds.
    """
    drivers, positions, laps, stints = await _gather(session_key)

    driver_map = {d["driver_number"]: d for d in drivers}
    lap_map = {l["driver_number"]: l for l in laps}

    # Get current tire per driver (latest stint)
    tire_map = {}
    for stint in stints:
        drv = stint["driver_number"]
        if drv not in tire_map or stint["stint_number"] > tire_map[drv]["stint_number"]:
            tire_map[drv] = stint

    result = []
    leader_lap_time = None

    for i, pos in enumerate(positions):
        drv_num = pos["driver_number"]
        drv = driver_map.get(drv_num, {})
        lap = lap_map.get(drv_num, {})
        tire = tire_map.get(drv_num, {})

        lap_time = lap.get("lap_duration")
        if i == 0 and lap_time:
            leader_lap_time = lap_time

        result.append({
            "position": pos["position"],
            "driver_number": drv_num,
            "acronym": drv.get("name_acronym", "???"),
            "full_name": drv.get("full_name", ""),
            "team": drv.get("team_name", ""),
            "team_color": drv.get("team_colour", "666666"),
            "headshot_url": drv.get("headshot_url", ""),
            "lap_number": lap.get("lap_number", 0),
            "lap_time": lap_time,
            "sector_1": lap.get("duration_sector_1"),
            "sector_2": lap.get("duration_sector_2"),
            "sector_3": lap.get("duration_sector_3"),
            "st_speed": lap.get("st_speed"),
            "is_pit_out": lap.get("is_pit_out_lap", False),
            "compound": tire.get("compound", "UNKNOWN"),
            "tire_age": tire.get("tyre_age_at_start", 0),
            "stint_number": tire.get("stint_number", 1),
            "gap_to_leader": round(lap_time - leader_lap_time, 3) if lap_time and leader_lap_time and i > 0 else 0.0,
        })

    return {
        "session_key": session_key,
        "drivers": result,
        "total_drivers": len(result),
    }


async def _gather(session_key: int):
    import asyncio
    drivers = await get_session_drivers(session_key)
    await asyncio.sleep(0.3)
    positions = await get_latest_positions(session_key)
    await asyncio.sleep(0.3)
    laps = await get_latest_laps(session_key)
    await asyncio.sleep(0.3)
    stints = await get_stints(session_key)
    return drivers, positions, laps, stints

async def get_sessions(year: int) -> list:
    """Get all race sessions for a year."""
    return await _get("sessions", {"year": year, "session_type": "Race"})