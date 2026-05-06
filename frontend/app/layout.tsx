import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitWall — F1 Strategy Intelligence",
  description: "Lap-by-lap F1 race strategy analysis. Tire degradation, undercut windows, pit stop replays.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="speed-lines" />
        <nav className="border-b border-pitwall-border px-6 py-0 flex items-center gap-6 relative z-10 bg-pitwall-bg/80 backdrop-blur-sm sticky top-0">
          {/* Red left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-pitwall-accent" />
          
          <Link href="/strategy" className="display text-2xl font-900 tracking-widest text-pitwall-accent uppercase py-4 hover:opacity-80 transition-opacity orbitron">
            PitWall
          </Link>

          <div className="h-6 w-px bg-pitwall-border" />

          <span className="text-xs text-pitwall-muted font-mono uppercase tracking-widest hidden md:block">
            F1 Strategy Intelligence
          </span>

          <div className="ml-auto flex items-center">
            {[
              { href: "/strategy", label: "Strategy" },
              { href: "/drivers", label: "Driver DNA" },
              { href: "/championship", label: "Championship" },
              { href: "/live", label: "Live" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-4 text-xs font-mono uppercase tracking-widest text-pitwall-muted hover:text-pitwall-text relative group transition-colors"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pitwall-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
            ))}

            {/* Live indicator */}
            <div className="ml-4 pl-4 border-l border-pitwall-border flex items-center gap-2">
              <div className="live-dot" />
              <span className="font-mono text-xs text-pitwall-muted uppercase tracking-widest">Live</span>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}