from fastapi import APIRouter, HTTPException
from app.services import openf1_service

router = APIRouter(prefix="/live", tags=["live"])


@router.get("/session/current")
async def get_current_session():
    """Get currently active or most recent race session."""
    session = await openf1_service.get_current_session()
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    return session


@router.get("/session/{session_key}/state")
async def get_race_state(session_key: int):
    """Full race state — positions, lap times, tire compounds."""
    return await openf1_service.get_race_state(session_key)


@router.get("/sessions/{year}")
async def get_sessions(year: int):
    """All race sessions for a year."""
    sessions = await openf1_service.get_sessions(year)
    return {"year": year, "sessions": sessions}