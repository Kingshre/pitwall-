"""
Team Radio Sentiment Analysis Service
"""
import httpx
import asyncio
import json
from typing import Optional
import anthropic
from collections import Counter

OPENF1_BASE = "https://api.openf1.org/v1"
client = anthropic.AsyncAnthropic()


async def get_sessions(year: int, session_type: str = "Race"):
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.get(
            f"{OPENF1_BASE}/sessions",
            params={"year": year, "session_type": session_type}
        )
        resp.raise_for_status()
        return resp.json()


async def get_radio_messages(session_key: int):
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.get(
            f"{OPENF1_BASE}/team_radio",
            params={"session_key": session_key}
        )
        resp.raise_for_status()
        return resp.json()[:80]  # cap at 80 messages


async def get_drivers_for_session(session_key: int):
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.get(
            f"{OPENF1_BASE}/drivers",
            params={"session_key": session_key}
        )
        resp.raise_for_status()
        return resp.json()


async def analyze_radio_batch(messages: list[dict]) -> dict:
    if not messages:
        return {}

    lines = []
    for i, msg in enumerate(messages):
        lines.append(
            f"[{i}] Driver #{msg.get('driver_number','?')} at {msg.get('date','')}"
        )

    prompt = f"""You are analyzing Formula 1 team radio metadata for sentiment analysis.

I have {len(messages)} radio transmissions from a race. Each entry has a driver number and timestamp.

Message log:
{chr(10).join(lines[:60])}

Based on message frequency and timing patterns, analyze the race communications.

Respond ONLY with valid JSON, no markdown, no explanation:
{{
  "race_narrative": "2-3 sentence summary of the communications pattern across this race",
  "driver_profiles": [
    {{
      "driver_number": 44,
      "message_count": 12,
      "communication_intensity": "high",
      "sentiment": "mixed",
      "dominant_emotion": "pressured",
      "key_insight": "one sentence about this driver's pattern"
    }}
  ],
  "race_mood_arc": [
    {{"phase": "Start (L1-10)", "intensity": 0.8, "dominant_mood": "excited"}},
    {{"phase": "Mid (L11-30)", "intensity": 0.5, "dominant_mood": "focused"}},
    {{"phase": "Late (L31-50)", "intensity": 0.7, "dominant_mood": "pressured"}},
    {{"phase": "Final (L51+)", "intensity": 0.9, "dominant_mood": "intense"}}
  ]
}}

Valid values:
- communication_intensity: "high" | "medium" | "low"
- sentiment: "positive" | "neutral" | "negative" | "mixed"
- dominant_emotion: "focused" | "frustrated" | "confident" | "pressured" | "calm" | "excited"
"""

    response = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


async def analyze_session_radio(session_key: int):
    messages, drivers = await asyncio.gather(
        get_radio_messages(session_key),
        get_drivers_for_session(session_key)
    )

    driver_map = {
        d["driver_number"]: {
            "name": d.get("full_name", f"Driver #{d['driver_number']}"),
            "abbreviation": d.get("name_acronym", "---"),
            "team": d.get("team_name", "Unknown"),
            "team_colour": d.get("team_colour", "666666"),
        }
        for d in drivers
    }

    driver_counts = Counter(m["driver_number"] for m in messages)
    analysis = await analyze_radio_batch(messages)

    # Merge real driver info into AI profiles
    for profile in analysis.get("driver_profiles", []):
        dn = profile.get("driver_number")
        if dn in driver_map:
            profile.update(driver_map[dn])
        if dn in driver_counts:
            profile["message_count"] = driver_counts[dn]

    return {
        "session_key": session_key,
        "total_messages": len(messages),
        "message_timeline": [
            {
                "driver_number": m["driver_number"],
                "date": m.get("date", ""),
                "recording_url": m.get("recording_url", ""),
            }
            for m in messages
        ],
        "analysis": analysis,
    }