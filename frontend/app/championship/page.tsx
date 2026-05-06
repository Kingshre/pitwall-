"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SEASONS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

interface DriverResult {
  driver: string;
  team: string;
  points: number;
  probability: number;
  avg_final_points: number;
  p10_points: number;
  p90_points: number;
  points_gap: number;
  max_possible: number;
  mathematically_alive: boolean;
  elo: number;
}

interface SimResult {
  year: number;
  season_complete: boolean;
  champion?: string;
  simulations: number;
  remaining_races: number;
  results: DriverResult[];
}

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6",
  "Mercedes": "#27F4D2",
  "Ferrari": "#E8002D",
  "McLaren": "#FF8000",
  "Aston Martin": "#358C75",
  "Alpine": "#FF87BC",
  "Williams": "#64C4FF",
  "AlphaTauri": "#5E8FAA",
  "RB": "#5E8FAA",
  "Haas F1 Team": "#B6BABD",
  "Alfa Romeo": "#C92D4B",
  "Alfa Romeo Racing": "#C92D4B",
  "Kick Sauber": "#52E252",
};

function getTeamColor(team: string): string {
  return TEAM_COLORS[team] || "#666";
}

export default function ChampionshipPage() {
  const [year, setYear] = useState(2023);
  const [data, setData] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const simulate = async (y: number) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`${API}/championship/simulate/${y}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch (e) {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { simulate(year); }, [year]);

  const top = data?.results?.[0];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="display text-6xl font-extrabold uppercase tracking-tight mb-2">
          Championship <span className="text-pitwall-accent">Engine</span>
        </h1>
        <p className="text-pitwall-muted font-mono text-sm">
          Bayesian title odds — Elo ratings + 50,000 Monte Carlo simulations per season.
        </p>
      </div>

      {/* Season selector */}
      <div className="flex gap-2 mb-8">
        {SEASONS.map(s => (
          <button
            key={s}
            onClick={() => setYear(s)}
            className={`px-4 py-2 text-sm font-mono border transition-colors ${
              year === s
                ? "border-pitwall-accent text-pitwall-accent bg-pitwall-accent/10"
                : "border-pitwall-border text-pitwall-muted hover:border-pitwall-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-pitwall-surface border border-pitwall-border p-8">
          <div className="font-mono text-xs text-pitwall-accent animate-pulse uppercase tracking-widest mb-4">
            Running 50,000 simulations...
          </div>
          {["Sampling Elo distributions", "Drawing finishing orders", "Awarding points", "Computing confidence intervals", "Crowning champion"].map((step, i) => (
            <div key={step} className="mb-2 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-pitwall-accent animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              <span className="font-mono text-xs text-pitwall-muted">{step}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-pitwall-accent/50 bg-pitwall-accent/5 p-4 font-mono text-xs text-pitwall-accent">
          {error}
        </div>
      )}

      {data && !loading && (
        <div>
          {/* Season status */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`px-3 py-1 font-mono text-xs uppercase tracking-widest border ${
              data.season_complete
                ? "border-pitwall-muted text-pitwall-muted"
                : "border-pitwall-accent text-pitwall-accent"
            }`}>
              {data.season_complete ? "Season Complete" : `${data.remaining_races} races remaining`}
            </div>
            {data.season_complete && data.champion && (
              <div className="font-mono text-xs text-pitwall-muted">
                Champion: <span className="text-pitwall-text">{data.champion}</span>
              </div>
            )}
            {!data.season_complete && (
              <div className="font-mono text-xs text-pitwall-muted">
                {data.simulations.toLocaleString()} simulations
              </div>
            )}
          </div>

          {/* Probability bars */}
          <div className="bg-pitwall-surface border border-pitwall-border p-6 mb-6">
            <div className="font-mono text-xs text-pitwall-muted uppercase tracking-widest mb-4">
              Title Probability
            </div>
            {data.results.filter(d => d.mathematically_alive !== false).slice(0, 10).map((d, i) => {
              const color = getTeamColor(d.team);
              const pct = (d.probability * 100).toFixed(1);
              return (
                <div key={d.driver} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                      <span className="font-mono text-xs text-pitwall-text">{d.driver}</span>
                      <span className="font-mono text-xs text-pitwall-muted">{d.team}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-pitwall-muted">{d.points} pts</span>
                      <span className="font-mono text-xs font-bold" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-pitwall-border rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-700"
                      style={{ width: `${d.probability * 100}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Points projection table */}
          <div className="bg-pitwall-surface border border-pitwall-border p-6">
            <div className="font-mono text-xs text-pitwall-muted uppercase tracking-widest mb-4">
              Points Projection
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-pitwall-border text-pitwall-muted">
                  <th className="text-left py-2">POS</th>
                  <th className="text-left py-2">DRIVER</th>
                  <th className="text-right py-2">ELO</th>
                  <th className="text-right py-2">PTS</th>
                  <th className="text-right py-2">AVG FINAL</th>
                  <th className="text-right py-2">P10–P90</th>
                  <th className="text-right py-2">PROBABILITY</th>
                </tr>
              </thead>
              <tbody>
                {data.results.slice(0, 15).map((d, i) => {
                  const color = getTeamColor(d.team);
                  return (
                    <tr key={d.driver} className="border-b border-pitwall-border/30">
                      <td className="py-2 text-pitwall-muted">{i + 1}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-sm" style={{ background: color }} />
                          <span className="text-pitwall-text">{d.driver}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-pitwall-muted">{d.elo?.toFixed(0) ?? "—"}</td>
                      <td className="py-2 text-right text-pitwall-text">{d.points}</td>
                      <td className="py-2 text-right text-pitwall-text">{d.avg_final_points}</td>
                      <td className="py-2 text-right text-pitwall-muted">
                        {d.p10_points}–{d.p90_points}
                      </td>
                      <td className="py-2 text-right font-bold" style={{ color: d.probability > 0 ? color : "#4A4A6A" }}>
                        {(d.probability * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}