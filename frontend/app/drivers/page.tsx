"use client";

import { useState, useEffect } from "react";
import DriverDNA from "@/components/DriverDNA";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SEASONS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

interface Driver {
  driver: string;
  team: string;
}

interface DriverData {
  driver: string;
  scores: Record<string, number>;
  rounds_analyzed: number;
}

export default function DriversPage() {
  const [year, setYear] = useState(2023);
  const [driverList, setDriverList] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fingerprints, setFingerprints] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setLoadingDrivers(true);
    setSelected([]);
    setFingerprints([]);
    fetch(`${API}/drivers/seasons/${year}`)
      .then(r => r.json())
      .then(d => setDriverList(d.drivers || []))
      .finally(() => setLoadingDrivers(false));
  }, [year]);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleDriver = (abbr: string) => {
    setSelected(prev =>
      prev.includes(abbr)
        ? prev.filter(d => d !== abbr)
        : prev.length < 3 ? [...prev, abbr] : prev
    );
  };

  const analyze = async () => {
    if (!selected.length) return;
    setLoading(true);
    setFingerprints([]);
    try {
      const results = await Promise.all(
        selected.map(d =>
          fetch(`${API}/drivers/${year}/${d}/fingerprint`).then(r => r.json())
        )
      );
      setFingerprints(results.filter(r => r.scores));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="display text-6xl font-extrabold uppercase tracking-tight mb-2">
          Driver <span className="text-pitwall-accent">DNA</span>
        </h1>
        <p className="text-pitwall-muted font-mono text-sm">
          6-axis performance fingerprint — qualifying pace, race pace, tyre management,
          consistency, overtaking, wet weather. Select up to 3 drivers to compare.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
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

      {loadingDrivers ? (
        <div className="text-pitwall-muted font-mono text-sm animate-pulse mb-6">Loading drivers...</div>
      ) : (
        <div className="mb-6">
          <div className="text-pitwall-muted font-mono text-xs uppercase tracking-widest mb-2">
            Select up to 3 drivers
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {driverList.map(d => (
              <button
                key={d.driver}
                onClick={() => toggleDriver(d.driver)}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${
                  selected.includes(d.driver)
                    ? "border-pitwall-accent text-pitwall-accent bg-pitwall-accent/10"
                    : "border-pitwall-border text-pitwall-muted hover:border-pitwall-muted"
                }`}
              >
                {d.driver}
              </button>
            ))}
          </div>
          <button
            onClick={analyze}
            disabled={!selected.length || loading}
            className="px-6 py-3 bg-pitwall-accent text-white font-mono text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            {loading ? `Analyzing... ${elapsed}s` : "Analyze"}
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-pitwall-surface border border-pitwall-border p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-xs text-pitwall-accent uppercase tracking-widest animate-pulse">
              Fetching {selected.join(", ")} · {year}
            </div>
            <div className="font-mono text-xs text-pitwall-muted">
              {elapsed < 60 ? `~${60 - elapsed}s remaining` : "Almost done..."}
            </div>
          </div>
          {["QUALIFYING", "RACE PACE", "TYRE MGMT", "CONSISTENCY", "OVERTAKING", "WET WEATHER"].map((label, i) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-xs text-pitwall-muted">{label}</span>
                <span className="font-mono text-xs text-pitwall-muted">—</span>
              </div>
              <div className="h-px bg-pitwall-border overflow-hidden">
                <div
                  className="h-full bg-pitwall-accent/50"
                  style={{ width: `${Math.min(100, (elapsed / 60) * 100)}%`, transition: "width 1s linear" }}
                />
              </div>
            </div>
          ))}
          <p className="font-mono text-xs text-pitwall-muted mt-6">
            Loading {selected.length} driver{selected.length > 1 ? "s" : ""} across 8 rounds from FastF1.
          </p>
        </div>
      )}

      {fingerprints.length > 0 && (
        <div className="bg-pitwall-surface border border-pitwall-border p-8">
          <DriverDNA drivers={fingerprints} />
        </div>
      )}
    </div>
  );
}