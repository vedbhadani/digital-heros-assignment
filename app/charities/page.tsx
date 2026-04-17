import Link from "next/link";

import { readDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CharitiesPage() {
  const database = await readDatabase();
  const charities = database.charities.filter((charity) => charity.active);

  return (
    <main className="landing-shell">
      <div className="landing-shell__veil" />
      
      <div className="container-main section stack-md" style={{ gap: "48px" }}>
        <header className="stack-md" style={{ gap: "8px" }}>
          <Link className="label text-accent" href="/">← Back to home</Link>
          <h1 className="h1">Cause Directory</h1>
          <p className="body text-muted">Explore every organization leading the impact experience at Fair Chance Club.</p>
        </header>

        <section className="grid-system grid-cols-3">
          {charities.map((charity) => (
            <article
              className="card stack-md"
              key={charity.id}
              style={{
                backgroundImage: charity.visual.mesh,
                borderColor: charity.visual.accent,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div className="stack-md" style={{ gap: "4px" }}>
                <span className="label" style={{ color: charity.visual.accent }}>{charity.category}</span>
                <h3 className="h3">{charity.name}</h3>
                <p className="body text-muted" style={{ fontSize: "14px" }}>{charity.shortDescription}</p>
              </div>

              <div className="flex-row" style={{ gap: "4px", marginTop: "auto", paddingTop: "16px" }}>
                {charity.tags.slice(0, 2).map((tag) => (
                  <span className="label" key={tag} style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex-between" style={{ marginTop: "16px" }}>
                <span className="label" style={{ fontSize: "12px" }}>{charity.location}</span>
                <span className="label text-accent" style={{ fontSize: "12px" }}>{charity.impactMetric}</span>
              </div>

              <Link className="btn-ghost" style={{ width: "100%", marginTop: "16px" }} href={`/charities/${charity.slug}`}>
                View Details
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
