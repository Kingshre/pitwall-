"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SEASONS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

interface Race {
  round: number;
  name: string;
  location: string;
  country: string;
  date: string;
}

export default function Home() {
  const router = useRouter();
  const [year, setYear] = useState(2023);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/races/seasons/${year}`)
      .then((r) => r.json())
      .then((d) => setRaces(d.races || []))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="display text-6xl font-extrabold uppercase tracking-tight text-pitwall-text mb-2">
          Strategy <span className="text-pitwall-accent">Replayer</span>
        </h1>
        <p className="text-pitwall-muted font-mono text-sm">
          Select a race to explore lap-by-lap strategy, tire degradation, and undercut windows.
        </p>
      </div>

      {/* Season selector */}
      <div className="flex gap-2 mb-8">
        {SEASONS.map((s) => (
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

      {/* Race grid */}
      {loading ? (
        <div className="text-pitwall-muted font-mono text-sm animate-pulse">Loading calendar...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {races.map((race) => (
            <button
              key={race.round}
              onClick={() => router.push(`/race/${year}/${race.round}`)}
              className="text-left p-4 border border-pitwall-border bg-pitwall-surface hover:border-pitwall-accent hover:bg-pitwall-accent/5 transition-all group"
            >
              <div className="text-pitwall-muted font-mono text-xs mb-1">
                RD {String(race.round).padStart(2, "0")} · {race.date}
              </div>
              <div className="display text-xl font-bold uppercase text-pitwall-text group-hover:text-pitwall-accent transition-colors">
                {race.name}
              </div>
              <div className="font-mono text-xs text-pitwall-muted mt-1">{race.location}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
