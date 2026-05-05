"""
Supabase cache service — wraps f1_cache table.
Cache keys are deterministic strings like "fingerprint:2023:HAM".
"""

import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

_client: Client | None = None

def _get_client() -> Client | None:
    global _client
    if _client is None and SUPABASE_URL and SUPABASE_KEY:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def get(key: str) -> dict | None:
    client = _get_client()
    if not client:
        return None
    try:
        res = client.table("f1_cache").select("data").eq("key", key).single().execute()
        return res.data["data"] if res.data else None
    except Exception:
        return None


def set(key: str, data: dict) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.table("f1_cache").upsert({"key": key, "data": data}).execute()
    except Exception:
        pass