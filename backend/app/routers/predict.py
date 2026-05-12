from fastapi import APIRouter, HTTPException, Query
from app.services.predict_service import get_qualifying_results, run_prediction_v2
from app.services.radio_service import get_sessions

router = APIRouter(prefix="/predict", tags=["predict"])


@router.get("/races")
async def list_races(year: int = Query(default=2024)):
    """List race sessions for year — reuses OpenF1 sessions."""
    try:
        sessions = await get_sessions(year, session_type="Race")
        return [
            {
                "session_key": s["session_key"],
                "meeting_name": s.get("meeting_name", ""),
                "country_name": s.get("country_name", ""),
                "date_start": s.get("date_start", ""),
            }
            for s in sessions if s.get("session_key")
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qualifying/{session_key}")
async def qualifying(session_key: int):
    """Get qualifying grid for a session."""
    try:
        return await get_qualifying_results(session_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/run/{session_key}")
async def predict(session_key: int, season: int = Query(default=2024)):
    """Run full race prediction for a session."""
    try:
        return await run_prediction_v2(session_key, season)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))