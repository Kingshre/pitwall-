import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitWall — F1 Strategy Intelligence",
  description: "Lap-by-lap F1 race strategy analysis. Tire degradation, undercut windows, pit stop replays.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b border-pitwall-border px-6 py-4 flex items-center gap-4">
          <span className="display text-2xl font-800 tracking-widest text-pitwall-accent uppercase">
            PitWall
          </span>
          <span className="text-xs text-pitwall-muted font-mono uppercase tracking-widest">
            F1 Strategy Intelligence
            <a href="/drivers" className="text-xs text-pitwall-muted font-mono uppercase tracking-widest hover:text-pitwall-accent transition-colors ml-4">
  Driver DNA
</a>
          </span>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
