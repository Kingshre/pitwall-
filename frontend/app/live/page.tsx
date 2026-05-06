"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TIRE_COLORS: Record<string, string> = {
  SOFT: "#E8002D",
  MEDIUM: "#FFF200",
  HARD: "#EBEBEB",
  INTERMEDIATE: "#39B54A",
  WET: "#0067FF",
  UNKNOWN: "#666",
};

const TIRE_SHORT: Record<string, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
  UNKNOWN: "?",
};

interface Driver {
  position: number;
  driver_number: number;
  acronym: string;
  full_name: string;
  team: string;
  team_color: string;
  lap_number: number;
  lap_time: number | null;
  sector_1: number | null;
  sector_2: number | null;
  sector_3: number | null;
  st_speed: number | null;
  is_pit_out: boolean;
  compound: string;
  tire_age: number;
  stint_number: number;
  gap_to_leader: number;
}

interface RaceState {
  session_key: number;
  drivers: Driver[];
  total_drivers: number;
}

interface Session {
  session_key: number;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  is_live: boolean;
  year: number;
}

function formatLapTime(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${secs}`;
}

function formatGap(gap: number): string {
  if (gap === 0) return "LEADER";
  return `+${gap.toFixed(3)}`;
}

export default function LivePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<RaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const fetchSession = async () => {
    try {
      const res = await fetch(`${API}/live/session/current`);
      const data = await res.json();
      setSession(data);
      return data;
    } catch {
      setError("Failed to fetch session");
      return null;
    }
  };

  const fetchState = useCallback(async (sessionKey: number) => {
    try {
      const res = await fetch(`${API}/live/session/${sessionKey}/state`);
      const data = await res.json();
      setState(data);
      setLastUpdate(new Date());
    } catch {
      setError("Failed to fetch race state");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const s = await fetchSession();
      if (s?.session_key) {
        await fetchState(s.session_key);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Auto-refresh every 10s if live
  useEffect(() => {
    if (!session?.is_live || !session?.session_key) return;
    const interval = setInterval(() => fetchState(session.session_key), 10000);
    return () => clearInterval(interval);
  }, [session, fetchState]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="display text-6xl font-extrabold uppercase tracking-tight">
            Live <span className="text-pitwall-accent">Tracker</span>
          </h1>
          {session?.is_live && (
            <div className="flex items-center gap-2 px-3 py-1 border border-pitwall-accent bg-pitwall-accent/10">
              <div className="live-dot" />
              <span className="font-mono text-xs text-pitwall-accent uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
        {session && (
          <div className="flex items-center gap-4">
            <p className="text-pitwall-muted font-mono text-sm">
              {session.circuit_short_name} · {session.country_name} · {session.year}
            </p>
            {!session.is_live && (
              <span className="font-mono text-xs text-pitwall-muted border border-pitwall-border px-2 py-0.5">
                Race Finished
              </span>
            )}
            {lastUpdate && (
              <span className="font-mono text-xs text-pitwall-muted">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-pitwall-surface border border-pitwall-border p-8">
          <div className="font-mono text-xs text-pitwall-accent animate-pulse uppercase tracking-widest mb-4">
            Fetching race data from OpenF1...
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3 opacity-30">
              <div className="w-6 h-4 bg-pitwall-border rounded" />
              <div className="w-12 h-4 bg-pitwall-border rounded" />
              <div className="flex-1 h-4 bg-pitwall-border rounded" />
              <div className="w-20 h-4 bg-pitwall-border rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-pitwall-accent/50 bg-pitwall-accent/5 p-4 font-mono text-xs text-pitwall-accent">
          {error}
        </div>
      )}

      {state && !loading && (
        <div className="bg-pitwall-surface border border-pitwall-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_3rem_1fr_1fr_6rem_6rem_6rem_3rem_4rem] gap-2 px-4 py-2 border-b border-pitwall-border font-mono text-xs text-pitwall-muted uppercase tracking-widest">
            <div>P</div>
            <div>No.</div>
            <div>Driver</div>
            <div>Team</div>
            <div className="text-right">Last Lap</div>
            <div className="text-right">Gap</div>
            <div className="text-right">Speed</div>
            <div className="text-center">Tire</div>
            <div className="text-right">Age</div>
          </div>

          {state.drivers.map((d, i) => {
            const teamColor = `#${d.team_color}`;
            return (
              <div
                key={d.driver_number}
                className="grid grid-cols-[2rem_3rem_1fr_1fr_6rem_6rem_6rem_3rem_4rem] gap-2 px-4 py-3 border-b border-pitwall-border/30 hover:bg-pitwall-surface-2 transition-colors items-center"
              >
                {/* Position */}
                <div className="font-mono text-sm font-bold text-pitwall-muted">
                  {d.position}
                </div>

                {/* Number */}
                <div
                  className="font-mono text-xs font-bold px-1 py-0.5 text-center rounded"
                  style={{ background: teamColor + "20", color: teamColor, border: `1px solid ${teamColor}40` }}
                >
                  {d.driver_number}
                </div>

                {/* Driver */}
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-5 rounded" style={{ background: teamColor }} />
                  <span className="font-mono text-sm font-bold text-pitwall-text">{d.acronym}</span>
                  <span className="font-mono text-xs text-pitwall-muted hidden md:block">{d.full_name}</span>
                </div>

                {/* Team */}
                <div className="font-mono text-xs text-pitwall-muted truncate">{d.team}</div>

                {/* Lap time */}
                <div className={`font-mono text-sm text-right ${d.is_pit_out ? "text-pitwall-yellow" : "text-pitwall-text"}`}>
                  {d.is_pit_out ? "PIT" : formatLapTime(d.lap_time)}
                </div>

                {/* Gap */}
                <div className={`font-mono text-xs text-right ${d.gap_to_leader === 0 ? "text-pitwall-accent font-bold" : "text-pitwall-muted"}`}>
                  {formatGap(d.gap_to_leader)}
                </div>

                {/* Speed */}
                <div className="font-mono text-xs text-right text-pitwall-muted">
                  {d.st_speed ? `${d.st_speed} km/h` : "—"}
                </div>

                {/* Tire */}
                <div className="flex justify-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      background: TIRE_COLORS[d.compound] + "30",
                      border: `2px solid ${TIRE_COLORS[d.compound]}`,
                      color: TIRE_COLORS[d.compound],
                    }}
                    title={d.compound}
                  >
                    {TIRE_SHORT[d.compound] || "?"}
                  </div>
                </div>

                {/* Tire age */}
                <div className="font-mono text-xs text-right text-pitwall-muted">
                  +{d.tire_age}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {session && !session.is_live && (
        <div className="mt-4 font-mono text-xs text-pitwall-muted text-center">
          Showing final classification for {session.circuit_short_name} {session.year} ·
          Auto-refreshes during live sessions
        </div>
      )}
    </div>
  );
}