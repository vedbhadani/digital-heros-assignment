import Link from "next/link";

import { drawTierLabels, formatMoney } from "@/lib/display";
import type { AppSettings, CharityRecord, DrawRecord, PublicUserRecord } from "@/lib/types";

type HomePageProps = {
  charities: CharityRecord[];
  currentUser: PublicUserRecord | null;
  latestPublishedDraw: DrawRecord | null;
  settings: AppSettings;
};

export function HomePage({ charities, currentUser, latestPublishedDraw, settings }: HomePageProps) {
  const featuredCharities = charities.filter((charity) => charity.featured).slice(0, 3);

  return (
    <main className="landing-shell">
      <div className="landing-shell__veil" />
      
      {/* TOPBAR */}
      <header className="container-main section">
        <div className="flex-between">
          <Link className="flex-row" style={{ textDecoration: "none" }} href="/">
            <div style={{ width: "12px", height: "12px", background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 10px var(--accent)" }} />
            <span className="h3">Fair Chance Club</span>
          </Link>

          <nav className="flex-row">
            <Link className="label" href="/charities">Charities</Link>
            {currentUser ? (
              <Link className="btn-ghost" href={currentUser.role === "admin" ? "/admin" : "/dashboard"}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link className="label" href="/login">Login</Link>
                <Link className="btn-primary" href="/signup">
                  Subscribe
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="container-main section">
        <div className="grid-system grid-cols-2" style={{ alignItems: "center" }}>
          <div className="stack-md" style={{ gap: "24px" }}>
            <div className="stack-md" style={{ gap: "8px" }}>
              <span className="label text-accent" style={{ letterSpacing: "0.1rem", textTransform: "uppercase" }}>Emotion-led product direction</span>
              <h1 className="h1">Play better. Fund real causes. Unlock rewards.</h1>
            </div>
            <p className="body text-muted">A dedicated space for golf tracking and charitable giving. No flashy visuals, just impact and competition.</p>
            <div className="flex-row">
              <Link className="btn-primary" href={currentUser ? (currentUser.role === "admin" ? "/admin" : "/dashboard") : "/signup"}>
                {currentUser ? "Continue to account" : "Join the club"}
              </Link>
              <Link className="btn-ghost" href="/charities">Explore causes</Link>
            </div>
          </div>

          <div className="stack-md">
            <div className="card stack-md">
              <span className="label text-accent">Draw Mechanics</span>
              <h3 className="h3">40 / 35 / 25 Split</h3>
              <p className="body text-muted">Prize pool split across match tiers with full jackpot rollovers.</p>
            </div>
            <div className="card stack-md">
              <span className="label text-accent">Score window</span>
              <h3 className="h3">Latest 5 rounds</h3>
              <p className="body text-muted">Your entry is locked to your 5 most recent Stableford scores.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CHARITIES GRID */}
      <section className="container-main section stack-md" style={{ gap: "32px" }}>
        <div className="stack-md" style={{ gap: "4px" }}>
          <span className="label text-accent">Featured Partners</span>
          <h2 className="h2">Causes that lead the experience</h2>
        </div>

        <div className="grid-system grid-cols-3">
          {featuredCharities.map((charity) => (
            <article key={charity.id} className="card stack-md" style={{ background: charity.visual.mesh, borderColor: charity.visual.accent }}>
              <span className="label" style={{ color: charity.visual.accent }}>{charity.category}</span>
              <h3 className="h3">{charity.name}</h3>
              <p className="body text-muted" style={{ fontSize: "14px" }}>{charity.shortDescription}</p>
              <Link className="btn-ghost" style={{ width: "100%", marginTop: "auto" }} href={`/charities/${charity.slug}`}>View Profile</Link>
            </article>
          ))}
        </div>
      </section>

      {/* DRAW PREVIEW */}
      {latestPublishedDraw && (
        <section className="container-main section">
          <div className="card stack-md" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="label text-accent">Monthly Snapshot</span>
            <h2 className="h2">{latestPublishedDraw.label} Result</h2>
            <div className="flex-row" style={{ gap: "12px", justifyContent: "center" }}>
              {latestPublishedDraw.numbers.map((n, i) => (
                <div key={i} className="card" style={{ padding: "8px 12px", minWidth: "44px" }}>{n}</div>
              ))}
            </div>
            <div className="flex-between" style={{ width: "100%", maxWidth: "400px", marginTop: "16px" }}>
              <span className="label">Prize Pool</span>
              <strong className="h3">{formatMoney(latestPublishedDraw.prizePoolCents, settings.currencyCode)}</strong>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER-LIKE ASIDE */}
      <footer className="container-main section" style={{ opacity: 0.5 }}>
        <div className="flex-between">
          <span className="label">© 2026 Fair Chance Club</span>
          <div className="flex-row">
            <Link className="label" href="/charities">Directory</Link>
            <Link className="label" href="/login">Subscriber Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
