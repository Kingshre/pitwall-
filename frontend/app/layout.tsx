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
        <nav className="border-b border-pitwall-border px-6 py-4 flex items-center gap-6">
          <Link href="/" className="display text-2xl font-800 tracking-widest text-pitwall-accent uppercase hover:opacity-80 transition-opacity">
            PitWall
          </Link>
          <span className="text-xs text-pitwall-muted font-mono uppercase tracking-widest hidden sm:block">
            F1 Strategy Intelligence
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-pitwall-muted hover:text-pitwall-text border border-transparent hover:border-pitwall-border transition-all">
              Strategy
            </Link>
            <Link href="/drivers" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-pitwall-muted hover:text-pitwall-text border border-transparent hover:border-pitwall-border transition-all">
              Driver DNA
            </Link>
            <Link href="/championship" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-pitwall-muted hover:text-pitwall-text border border-transparent hover:border-pitwall-border transition-all">
              Championship
            </Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}