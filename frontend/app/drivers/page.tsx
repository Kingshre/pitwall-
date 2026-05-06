"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TAGLINES = [
  "LAP-BY-LAP STRATEGY ANALYSIS",
  "DRIVER DNA FINGERPRINTS",
  "BAYESIAN TITLE PROBABILITY",
  "50,000 MONTE CARLO SIMULATIONS",
  "ELO-RATED SINCE 2018",
];

const STATS = [
  { value: "7", label: "Seasons" },
  { value: "4,076", label: "Race Results" },
  { value: "50K", label: "Simulations" },
  { value: "6", label: "DNA Axes" },
];

export default function LandingPage() {
  const router = useRouter();
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [speed, setSpeed] = useState(0);

  // Tagline rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % TAGLINES.length);
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Speed counter animation
  useEffect(() => {
    let v = 0;
    const target = 342;
    const step = setInterval(() => {
      v += 7;
      if (v >= target) { setSpeed(target); clearInterval(step); }
      else setSpeed(v);
    }, 16);
    return () => clearInterval(step);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* F1 car SVG speed lines background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px opacity-10"
            style={{
              top: `${8 + i * 7}%`,
              left: 0,
              right: 0,
              background: i % 3 === 0
                ? "linear-gradient(90deg, transparent, #E8002D, transparent)"
                : i % 3 === 1
                ? "linear-gradient(90deg, transparent, #00D2BE, transparent)"
                : "linear-gradient(90deg, transparent, #FFF200, transparent)",
              animation: `speedline ${1.5 + i * 0.2}s linear infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Speedline animation */}
      <style>{`
        @keyframes speedline {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes floatin {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes revlights {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; box-shadow: 0 0 20px currentColor; }
        }
        .floatin-1 { animation: floatin 0.6s ease-out 0.1s both; }
        .floatin-2 { animation: floatin 0.6s ease-out 0.3s both; }
        .floatin-3 { animation: floatin 0.6s ease-out 0.5s both; }
        .floatin-4 { animation: floatin 0.6s ease-out 0.7s both; }
        .floatin-5 { animation: floatin 0.6s ease-out 0.9s both; }
      `}</style>

      {/* Rev lights row */}
      <div className="flex justify-center gap-3 pt-16 floatin-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{
              background: "#E8002D",
              animation: `revlights 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
        <div className="w-8" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{
              background: "#E8002D",
              animation: `revlights 1s ease-in-out ${(i + 6) * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="floatin-2">
          <div className="font-mono text-xs text-pitwall-accent uppercase tracking-widest mb-4 flex items-center gap-2">
            <div className="live-dot" />
            F1 Strategy Intelligence Platform
          </div>

          <h1 className="display text-[clamp(4rem,12vw,10rem)] font-900 uppercase leading-none tracking-tight mb-2">
            <span className="text-pitwall-text glitch" data-text="PIT">PIT</span>
            <span className="text-pitwall-accent glitch" data-text="WALL">WALL</span>
          </h1>

          <div className="h-8 flex items-center mb-8">
            <span
              className="font-mono text-sm text-pitwall-teal uppercase tracking-widest transition-opacity duration-300"
              style={{ opacity: visible ? 1 : 0 }}
            >
              ▶ {TAGLINES[taglineIdx]}
            </span>
          </div>
        </div>

        {/* Speed stat */}
        <div className="floatin-3 mb-16">
          <div className="inline-flex items-end gap-2 border-l-2 border-pitwall-accent pl-4">
            <span className="orbitron text-5xl font-bold text-pitwall-text">{speed}</span>
            <span className="font-mono text-sm text-pitwall-muted mb-2">km/h top speed — 2023 Italian GP</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="floatin-3 grid grid-cols-4 gap-px border border-pitwall-border mb-16 overflow-hidden">
          {STATS.map((s, i) => (
            <div key={s.label} className="bg-pitwall-surface px-6 py-5 text-center">
              <div className="orbitron text-3xl font-bold text-pitwall-accent mb-1">{s.value}</div>
              <div className="font-mono text-xs text-pitwall-muted uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="floatin-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            {
              href: "/race/2023/1",
              tag: "Strategy",
              title: "Strategy Replayer",
              desc: "Lap-by-lap stint maps, tire degradation curves, and undercut windows for every race since 2018.",
              accent: "#E8002D",
              icon: "◈",
            },
            {
              href: "/drivers",
              tag: "Analytics",
              title: "Driver DNA",
              desc: "6-axis performance fingerprints across qualifying pace, race craft, tire management, wet weather and more.",
              accent: "#00D2BE",
              icon: "◉",
            },
            {
              href: "/championship",
              tag: "Prediction",
              title: "Championship Engine",
              desc: "Elo ratings + 50,000 Monte Carlo simulations produce Bayesian title probability with confidence intervals.",
              accent: "#FFF200",
              icon: "◎",
            },
          ].map((f) => (
            <button
              key={f.href}
              onClick={() => router.push(f.href)}
              className="f1-card text-left p-6 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-mono text-xs uppercase tracking-widest px-2 py-0.5 border"
                  style={{ color: f.accent, borderColor: f.accent + "40", background: f.accent + "10" }}
                >
                  {f.tag}
                </span>
                <span style={{ color: f.accent }} className="text-2xl">{f.icon}</span>
              </div>
              <h3
                className="display text-3xl font-bold uppercase mb-3 group-hover:opacity-80 transition-opacity"
                style={{ color: f.accent }}
              >
                {f.title}
              </h3>
              <p className="font-mono text-xs text-pitwall-muted leading-relaxed">
                {f.desc}
              </p>
              <div
                className="mt-4 font-mono text-xs uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: f.accent }}
              >
                Enter ▶
              </div>
            </button>
          ))}
        </div>

        {/* Bottom ticker */}
        <div className="floatin-5 border-t border-pitwall-border pt-4 overflow-hidden">
          <div className="flex gap-8 font-mono text-xs text-pitwall-muted animate-marquee whitespace-nowrap">
            {[
              "VER · 2023 CHAMPION · 19 WINS",
              "NOR · 2024 RUNNER-UP · 7 WINS",
              "HAM · 7× WORLD CHAMPION",
              "SCH · 7× WORLD CHAMPION",
              "SEN · 3× WORLD CHAMPION",
              "MCL · FASTEST LAP SPECIALIST",
              "RED BULL · 2023 CONSTRUCTORS",
              "FERRARI · MOST RACE WINS ALL-TIME",
            ].map((item, i) => (
              <span key={i} className="shrink-0">
                <span className="text-pitwall-accent">◆</span> {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}