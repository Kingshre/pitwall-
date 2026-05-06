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
        @keyframes f1drive {
          0% { transform: translateX(-120px) translateY(-50%); }
          100% { transform: translateX(calc(100vw + 120px)) translateY(-50%); }
        }
        @keyframes f1trail {
          0% { transform: translateX(-320px) translateY(-50%); }
          100% { transform: translateX(calc(100vw - 100px)) translateY(-50%); }
        }
        .floatin-1 { animation: floatin 0.6s ease-out 0.1s both; }
        .floatin-2 { animation: floatin 0.6s ease-out 0.3s both; }
        .floatin-3 { animation: floatin 0.6s ease-out 0.5s both; }
        .floatin-4 { animation: floatin 0.6s ease-out 0.7s both; }
        .floatin-5 { animation: floatin 0.6s ease-out 0.9s both; }
        .f1-car {
          position: absolute;
          top: 50%;
          left: 0;
          animation: f1drive 3.5s linear infinite;
        }
        .f1-trail {
          position: absolute;
          top: 50%;
          left: 0;
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E8002D);
          animation: f1trail 3.5s linear infinite;
        }
      `}</style>

      {/* F1 car animation */}
      <div className="relative w-full h-16 floatin-1 overflow-hidden">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-pitwall-border" />
        <div className="f1-trail" />
        <div className="f1-car">
          <svg width="120" height="28" viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 14 L25 8 L85 8 L100 11 L108 14 L100 17 L85 20 L25 20 Z" fill="#E8002D"/>
            <path d="M45 8 L52 4 L68 4 L75 8 Z" fill="#0E0E18" stroke="#E8002D" strokeWidth="0.5"/>
            <path d="M100 12 L115 10 L118 14 L115 18 L100 16 Z" fill="#E8002D"/>
            <path d="M12 7 L20 7 L20 9 L12 9 Z" fill="#E8002D"/>
            <path d="M12 19 L20 19 L20 21 L12 21 Z" fill="#E8002D"/>
            <path d="M14 9 L16 9 L16 19 L14 19 Z" fill="#E8002D"/>
            <circle cx="95" cy="21" r="4" fill="#222" stroke="#555" strokeWidth="1"/>
            <circle cx="95" cy="21" r="2" fill="#444"/>
            <circle cx="28" cy="21" r="5" fill="#222" stroke="#555" strokeWidth="1"/>
            <circle cx="28" cy="21" r="2.5" fill="#444"/>
            <circle cx="95" cy="7" r="4" fill="#222" stroke="#555" strokeWidth="1"/>
            <circle cx="95" cy="7" r="2" fill="#444"/>
            <circle cx="28" cy="7" r="5" fill="#222" stroke="#555" strokeWidth="1"/>
            <circle cx="28" cy="7" r="2.5" fill="#444"/>
            <path d="M52 4 L52 2 L68 2 L68 4" stroke="#E8002D" strokeWidth="1" fill="none"/>
            <text x="55" y="16" fill="white" fontSize="8" fontFamily="monospace" fontWeight="bold">1</text>
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-8">
        <div className="floatin-2">
          <div className="font-mono text-xs text-pitwall-accent uppercase tracking-widest mb-4 flex items-center gap-2">
            <div className="live-dot" />
            F1 Strategy Intelligence Platform
          </div>
          <h1 className="display text-[clamp(4rem,12vw,10rem)] font-900 uppercase leading-none tracking-tight mb-2">
            <span className="text-pitwall-text">PIT</span>
            <span className="text-pitwall-accent">WALL</span>
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

        <div className="floatin-3 mb-16">
          <div className="inline-flex items-end gap-2 border-l-2 border-pitwall-accent pl-4">
            <span className="orbitron text-5xl font-bold text-pitwall-text">{speed}</span>
            <span className="font-mono text-sm text-pitwall-muted mb-2">km/h top speed — 2023 Italian GP</span>
          </div>
        </div>

        <div className="floatin-3 grid grid-cols-4 gap-px border border-pitwall-border mb-16 overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="bg-pitwall-surface px-6 py-5 text-center">
              <div className="orbitron text-3xl font-bold text-pitwall-accent mb-1">{s.value}</div>
              <div className="font-mono text-xs text-pitwall-muted uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="floatin-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            {
              href: "/strategy",
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
              <p className="font-mono text-xs text-pitwall-muted leading-relaxed">{f.desc}</p>
              <div
                className="mt-4 font-mono text-xs uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: f.accent }}
              >
                Enter ▶
              </div>
            </button>
          ))}
        </div>

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