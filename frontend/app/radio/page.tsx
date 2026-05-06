"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  session_key: number;
  meeting_name: string;
  country_name: string;
  date_start: string;
}

interface DriverProfile {
  driver_number: number;
  name?: string;
  abbreviation?: string;
  team?: string;
  team_colour?: string;
  message_count: number;
  communication_intensity: "high" | "medium" | "low";
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  dominant_emotion: string;
  key_insight: string;
}

interface MoodPhase {
  phase: string;
  intensity: number;
  dominant_mood: string;
}

interface RadioData {
  total_messages: number;
  message_timeline: { driver_number: number; date: string; recording_url: string }[];
  analysis: {
    race_narrative: string;
    driver_profiles: DriverProfile[];
    race_mood_arc: MoodPhase[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "https://pitwall-production-d0a2.up.railway.app";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#00D2BE",
  neutral: "#9B9B9B",
  negative: "#E8002D",
  mixed: "#FF8700",
};

const EMOTION_ICONS: Record<string, string> = {
  focused: "◎",
  frustrated: "⚡",
  confident: "▲",
  pressured: "◈",
  calm: "◇",
  excited: "★",
};

const INTENSITY_PCT: Record<string, string> = {
  high: "100%",
  medium: "60%",
  low: "28%",
};

// ─── Mood Arc SVG ─────────────────────────────────────────────────────────────

function MoodArcChart({ arc }: { arc: MoodPhase[] }) {
  const W = 600, H = 110;
  const pad = { l: 12, r: 12, t: 12, b: 32 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  const pts = arc.map((p, i) => ({
    x: pad.l + (i / Math.max(arc.length - 1, 1)) * iW,
    y: pad.t + (1 - p.intensity) * iH,
    ...p,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${pad.t + iH} L${pts[0].x},${pad.t + iH}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8002D" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E8002D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ag)" />
      <path d={line} stroke="#E8002D" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#E8002D" stroke="#030303" strokeWidth="1.5" />
          <text x={p.x} y={pad.t + iH + 18} textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">
            {p.phase.split(" ")[0]}
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#666" fontSize="9" fontFamily="monospace">
            {p.dominant_mood}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Timeline Strip ───────────────────────────────────────────────────────────

function TimelineStrip({
  timeline,
  colorMap,
}: {
  timeline: RadioData["message_timeline"];
  colorMap: Record<number, string>;
}) {
  if (!timeline.length) return null;
  const sorted = [...timeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const t0 = new Date(sorted[0].date).getTime();
  const t1 = new Date(sorted[sorted.length - 1].date).getTime();
  const span = t1 - t0 || 1;

  return (
    <div
      className="relative w-full"
      style={{ height: "32px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "6px", overflow: "hidden" }}
    >
      {sorted.map((msg, i) => {
        const pct = ((new Date(msg.date).getTime() - t0) / span) * 100;
        return (
          <div
            key={i}
            title={`Driver #${msg.driver_number}`}
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: "4px",
              width: "3px",
              height: "24px",
              borderRadius: "2px",
              background: `#${colorMap[msg.driver_number] || "666666"}`,
              opacity: 0.75,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Driver Card ──────────────────────────────────────────────────────────────

function DriverCard({ p }: { p: DriverProfile }) {
  const sc = SENTIMENT_COLORS[p.sentiment] || "#666";
  const tc = p.team_colour ? `#${p.team_colour}` : "#666";

  return (
    <div
      style={{
        background: "#080808",
        border: "1px solid #1a1a1a",
        borderLeft: `3px solid ${tc}`,
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: "20px", color: tc }}>
            {p.abbreviation || `#${p.driver_number}`}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#555", marginTop: "2px" }}>{p.name}</div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#333", marginTop: "2px" }}>
            {p.team?.split(" ").slice(0, 2).join(" ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "32px", color: "#fff" }}>
            {p.message_count}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            transmissions
          </div>
        </div>
      </div>

      {/* Sentiment + Emotion */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{
          background: `${sc}22`, color: sc, fontFamily: "monospace",
          fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", padding: "3px 8px", borderRadius: "4px"
        }}>
          {p.sentiment}
        </span>
        <span style={{ color: "#555", fontFamily: "monospace", fontSize: "13px" }}>
          {EMOTION_ICONS[p.dominant_emotion] || "◎"}{" "}
          <span style={{ color: "#444", fontSize: "10px" }}>{p.dominant_emotion}</span>
        </span>
      </div>

      {/* Intensity bar */}
      <div>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
          intensity
        </div>
        <div style={{ height: "3px", background: "#111", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: INTENSITY_PCT[p.communication_intensity] || "50%", background: sc, borderRadius: "2px" }} />
        </div>
      </div>

      {/* Insight */}
      <p style={{
        fontFamily: "monospace", fontSize: "11px", color: "#555",
        lineHeight: 1.6, margin: 0,
        borderTop: "1px solid #111", paddingTop: "12px"
      }}>
        {p.key_insight}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RadioPage() {
  const [year, setYear] = useState(2024);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [radioData, setRadioData] = useState<RadioData | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingSessions(true);
    setError(null);
    setRadioData(null);
    setSelectedSession(null);
    fetch(`${API}/radio/sessions?year=${year}`)
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setError("Failed to load sessions"))
      .finally(() => setLoadingSessions(false));
  }, [year]);

  const runAnalysis = async () => {
    if (!selectedSession) return;
    setLoadingAnalysis(true);
    setError(null);
    setRadioData(null);

    const steps = [
      "Connecting to OpenF1...",
      "Fetching radio transmissions...",
      "Running Claude analysis...",
      "Building mood arc...",
    ];
    let si = 0;
    setStatusMsg(steps[0]);
    const iv = setInterval(() => {
      si = (si + 1) % steps.length;
      setStatusMsg(steps[si]);
    }, 2000);

    try {
      const resp = await fetch(`${API}/radio/analyze/${selectedSession}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRadioData(await resp.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(iv);
      setLoadingAnalysis(false);
    }
  };

  const colorMap: Record<number, string> = {};
  radioData?.analysis?.driver_profiles?.forEach((p) => {
    if (p.team_colour) colorMap[p.driver_number] = p.team_colour;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#030303", color: "#fff", fontFamily: "'DM Mono', monospace" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #111", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ color: "#E8002D", fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: "18px", textDecoration: "none" }}>
          PITWALL
        </a>
        <div style={{ display: "flex", gap: "24px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          {[["strategy","Strategy"],["drivers","Driver DNA"],["championship","Championship"],["live","Live"],["radio","Radio"]].map(([href, label]) => (
            <a key={href} href={`/${href}`} style={{ color: href === "radio" ? "#fff" : "#444", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E8002D", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "10px", color: "#E8002D", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>
              Claude AI · OpenF1
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, fontFamily: "'Orbitron', monospace", margin: 0, lineHeight: 1.1 }}>
            TEAM RADIO<br />
            <span style={{ color: "#E8002D" }}>SENTIMENT</span>
          </h1>
          <p style={{ color: "#444", fontSize: "13px", marginTop: "12px", maxWidth: "500px", lineHeight: 1.6, fontFamily: "monospace" }}>
            Claude analyzes radio communication patterns to map driver sentiment, emotional state, and race psychology across every grand prix.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#444", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>Season</div>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#fff", padding: "10px 16px", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", cursor: "pointer" }}
            >
              {[2024, 2023, 2022].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ fontSize: "10px", color: "#444", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>Grand Prix</div>
            <select
              value={selectedSession ?? ""}
              onChange={(e) => setSelectedSession(Number(e.target.value))}
              disabled={loadingSessions}
              style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#fff", padding: "10px 16px", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", cursor: "pointer" }}
            >
              <option value="">{loadingSessions ? "Loading sessions..." : "Select a race..."}</option>
              {sessions.map((s) => (
                <option key={s.session_key} value={s.session_key}>
                  {s.meeting_name || s.country_name} — {s.country_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={runAnalysis}
            disabled={!selectedSession || loadingAnalysis}
            style={{
              background: selectedSession && !loadingAnalysis ? "#E8002D" : "#1a1a1a",
              color: selectedSession && !loadingAnalysis ? "#fff" : "#444",
              border: "none",
              padding: "10px 28px",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "'Orbitron', monospace",
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: selectedSession && !loadingAnalysis ? "pointer" : "not-allowed",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {loadingAnalysis ? "Analyzing..." : "Analyze Race"}
          </button>
        </div>

        {/* Loading */}
        {loadingAnalysis && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", display: "inline-block", animation: "spin 2s linear infinite" }}>⬡</div>
            <div style={{ fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E8002D", fontFamily: "monospace" }}>
              {statusMsg}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #E8002D44", borderRadius: "8px", padding: "16px", color: "#E8002D", fontSize: "13px", fontFamily: "monospace", marginBottom: "24px" }}>
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {radioData && !loadingAnalysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

            {/* Narrative */}
            <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "24px" }}>
              <div style={{ fontSize: "10px", color: "#E8002D", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 700, fontFamily: "monospace" }}>
                Race Narrative · {radioData.total_messages} transmissions
              </div>
              <p style={{ color: "#aaa", fontSize: "14px", lineHeight: 1.7, margin: 0, fontFamily: "monospace" }}>
                {radioData.analysis.race_narrative}
              </p>
            </div>

            {/* Timeline */}
            <div>
              <div style={{ fontSize: "10px", color: "#444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "monospace" }}>
                Transmission Timeline
              </div>
              <TimelineStrip timeline={radioData.message_timeline} colorMap={colorMap} />
              <div style={{ fontSize: "9px", color: "#333", marginTop: "6px", fontFamily: "monospace" }}>
                Race start → finish · each bar = one transmission, colored by team
              </div>
            </div>

            {/* Mood Arc */}
            {radioData.analysis.race_mood_arc?.length > 0 && (
              <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "24px" }}>
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px", fontFamily: "monospace" }}>
                  Race Mood Arc
                </div>
                <MoodArcChart arc={radioData.analysis.race_mood_arc} />
              </div>
            )}

            {/* Driver Cards */}
            {radioData.analysis.driver_profiles?.length > 0 && (
              <div>
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px", fontFamily: "monospace" }}>
                  Driver Profiles · {radioData.analysis.driver_profiles.length} drivers
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {radioData.analysis.driver_profiles
                    .sort((a, b) => b.message_count - a.message_count)
                    .map((p) => <DriverCard key={p.driver_number} p={p} />)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        select option { background: #0d0d0d; }
      `}</style>
    </div>
  );
}