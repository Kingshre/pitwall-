from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services import ingestion_service, championship_service

router = APIRouter(prefix="/championship", tags=["championship"])


@router.post("/ingest/{year}")
async def ingest_season(year: int, background_tasks: BackgroundTasks):
    """Trigger data ingestion for a season. Runs in background."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    background_tasks.add_task(ingestion_service.ingest_season, year)
    return {"status": "ingestion started", "year": year}


@router.post("/ingest/all")
async def ingest_all(background_tasks: BackgroundTasks):
    """Ingest all seasons 2018-2024 in background."""
    background_tasks.add_task(ingestion_service.ingest_all_seasons)
    return {"status": "full ingestion started"}


@router.get("/results/{year}")
async def get_season_results(year: int):
    """Get all stored race results for a season."""
    from app.services.cache_service import _get_client
    client = _get_client()
    if not client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    res = client.table("race_results") \
        .select("*") \
        .eq("season", year) \
        .order("round") \
        .execute()
    return {"year": year, "results": res.data}