from fastapi import APIRouter, HTTPException
from app.services import driver_service

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/seasons/{year}")
async def get_season_drivers(year: int):
    """All drivers for a given season."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    try:
        drivers = driver_service.get_season_drivers(year)
        return {"year": year, "drivers": drivers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{driver}/fingerprint")
async def get_fingerprint(year: int, driver: str):
    """Driver DNA fingerprint — 6 normalized performance scores."""
    try:
        data = driver_service.get_driver_fingerprint(year, driver.upper())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))