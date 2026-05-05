from fastapi import APIRouter, HTTPException
from app.services import fastf1_service

router = APIRouter(prefix="/races", tags=["races"])


@router.get("/seasons/{year}")
async def get_season(year: int):
    """All races for a given F1 season."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    try:
        races = fastf1_service.get_season_races(year)
        return {"year": year, "races": races}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/laps")
async def get_laps(year: int, round: int):
    """Full lap-by-lap data for a race — core Strategy Replayer feed."""
    try:
        data = fastf1_service.get_lap_data(year, round)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/degradation")
async def get_degradation(year: int, round: int):
    """Tire degradation curves by compound for a race."""
    try:
        data = fastf1_service.get_tire_degradation(year, round)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/strategy")
async def get_strategy(year: int, round: int):
    """Undercut/overcut analysis and pit stop windows."""
    try:
        data = fastf1_service.get_strategy_analysis(year, round)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
