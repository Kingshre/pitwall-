from fastapi import APIRouter, HTTPException, Query
from app.services.radio_service import get_sessions, analyze_session_radio

router = APIRouter(prefix="/radio", tags=["radio"])


@router.get("/sessions")
async def list_sessions(year: int = Query(default=2024)):
    try:
        sessions = await get_sessions(year, session_type="Race")
        return [
            {
                "session_key": s["session_key"],
                "session_name": s.get("session_name", "Race"),
                "meeting_name": s.get("meeting_name", ""),
                "country_name": s.get("country_name", ""),
                "date_start": s.get("date_start", ""),
            }
            for s in sessions if s.get("session_key")
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/{session_key}")
async def analyze_radio(session_key: int):
    try:
        return await analyze_session_radio(session_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))