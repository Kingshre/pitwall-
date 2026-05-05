"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import LapChart from "@/components/LapChart";
import StrategyTimeline from "@/components/StrategyTimeline";
import TireDegChart from "@/components/TireDegChart";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TABS = ["Strategy Timeline", "Lap Times", "Tire Degradation"] as const;
type Tab = (typeof TABS)[number];

export default function RacePage() {
  const { year, round } = useParams<{ year: string; round: string }>();

  const [lapData, setLapData] = useState<any>(null);
  const [degData, setDegData] = useState<any>(null);
  const [strategyData, setStrategyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Strategy Timeline");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/races/${year}/${round}/laps`).then((r) => r.json()),
      fetch(`${API}/races/${year}/${round}/degradation`).then((r) => r.json()),
      fetch(`${API}/races/${year}/${round}/strategy`).then((r) => r.json()),
    ])
      .then(([laps, deg, strat]) => {
        setLapData(laps);
        setDegData(deg);
        setStrategyData(strat);
        // Default: top 5 finishers selected
        const top5 = laps.drivers?.slice(0, 5).map((d: any) => d.driver) || [];
        setSelectedDrivers(top5);
      })
      .finally(() => setLoading(false));
  }, [year, round]);

  const toggleDriver = (abbr: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(abbr) ? prev.filter((d) => d !== abbr) : [...prev, abbr]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-pitwall-muted font-mono text-sm animate-pulse">
        Loading race data... (first load fetches from FastF1, may take ~30s)
      </div>
    );
  }

  if (!lapData) return <div className="p-6 text-red-400">Failed to load race data.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Race header */}
      <div className="mb-8 border-b border-pitwall-border pb-6">
        <div className="text-pitwall-muted font-mono text-xs mb-1">
          {year} · ROUND {round}
        </div>
        <h1 className="display text-5xl font-extrabold uppercase tracking-tight">
          {lapData.race_name}
        </h1>
        <p className="text-pitwall-muted font-mono text-sm mt-1">
          {lapData.circuit} · {lapData.total_laps} laps
        </p>
      </div>

      {/* Driver filter */}
      <div className="mb-6">
        <div className="text-pitwall-muted font-mono text-xs mb-2 uppercase tracking-widest">Drivers</div>
        <div className="flex flex-wrap gap-2">
          {lapData.drivers?.map((d: any) => (
            <button
              key={d.driver}
              onClick={() => toggleDriver(d.driver)}
              className={`px-3 py-1 text-xs font-mono border transition-colors ${
                selectedDrivers.includes(d.driver)
                  ? "border-pitwall-accent text-pitwall-accent bg-pitwall-accent/10"
                  : "border-pitwall-border text-pitwall-muted hover:border-pitwall-muted"
              }`}
            >
              {d.driver}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-pitwall-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-mono transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-pitwall-accent text-pitwall-accent"
                : "border-transparent text-pitwall-muted hover:text-pitwall-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-pitwall-surface border border-pitwall-border p-4 min-h-[500px]">
        {activeTab === "Strategy Timeline" && (
          <StrategyTimeline
            lapData={lapData}
            strategyData={strategyData}
            selectedDrivers={selectedDrivers}
          />
        )}
        {activeTab === "Lap Times" && (
          <LapChart lapData={lapData} selectedDrivers={selectedDrivers} />
        )}
        {activeTab === "Tire Degradation" && (
          <TireDegChart degData={degData} />
        )}
      </div>
    </div>
  );
}
