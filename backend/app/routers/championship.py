from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services import ingestion_service, elo_service, monte_carlo_service
router = APIRouter(prefix="/championship", tags=["championship"])


@router.post("/ingest/all")
async def ingest_all(background_tasks: BackgroundTasks):
    """Ingest all seasons 2018-2024 in background."""
    background_tasks.add_task(ingestion_service.ingest_all_seasons)
    return {"status": "full ingestion started"}


@router.post("/ingest/{year}")
async def ingest_season(year: int, background_tasks: BackgroundTasks):
    """Trigger data ingestion for a season. Runs in background."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    background_tasks.add_task(ingestion_service.ingest_season, year)
    return {"status": "ingestion started", "year": year}


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


@router.post("/elo/all")
async def compute_elo_all(background_tasks: BackgroundTasks):
    """Compute Elo ratings for all seasons 2018-2024."""
    for year in range(2018, 2025):
        background_tasks.add_task(elo_service.compute_season_elos, year, True)
    return {"status": "elo computation started for all seasons"}


@router.post("/elo/{year}")
async def compute_elo(year: int, background_tasks: BackgroundTasks, force: bool = False):
    """Compute Elo ratings for a season."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    background_tasks.add_task(elo_service.compute_season_elos, year, force)
    return {"status": "elo computation started", "year": year}


@router.get("/elo/{year}/history")
async def get_elo_history(year: int):
    """Get full Elo history across a season."""
    history = elo_service.get_elo_history(year)
    return {"year": year, "history": history}


@router.get("/elo/{year}")
async def get_elo_ratings(year: int):
    """Get current Elo ratings for a season."""
    ratings = elo_service.get_current_elos(year)
    sorted_ratings = dict(sorted(ratings.items(), key=lambda x: x[1], reverse=True))
    return {"year": year, "ratings": sorted_ratings}

@router.get("/simulate/{year}")
async def simulate_championship(year: int, simulations: int = 50000):
    """Run Monte Carlo championship simulation."""
    if year < 2018 or year > 2025:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2025")
    return monte_carlo_service.simulate_championship(year, simulations)