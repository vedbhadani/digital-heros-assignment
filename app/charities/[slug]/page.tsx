import Link from "next/link";
import { notFound } from "next/navigation";

import { DonationForm } from "@/components/donation-form";
import { getCurrentUserRecord } from "@/lib/session";
import { readDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CharityProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getCurrentUserRecord();
  const database = await readDatabase();
  const charity = database.charities.find((candidate) => candidate.slug === slug && candidate.active);

  if (!charity) {
    notFound();
  }

  return (
    <main className="landing-shell">
      <div className="landing-shell__veil" />
      
      <div className="container-main section stack-md" style={{ gap: "48px" }}>
        <header className="stack-md" style={{ gap: "8px" }}>
          <Link className="label text-accent" href="/charities">← Back to directory</Link>
          <span className="label text-accent">{charity.category}</span>
          <h1 className="h1">{charity.name}</h1>
          <p className="body text-muted">{charity.shortDescription}</p>
        </header>

        {/* PROFILE HERO STATS */}
        <section className="grid-system grid-cols-3">
           <div className="card stack-md" style={{ gap: "4px" }}>
              <span className="label">Primary Location</span>
              <strong className="h3">{charity.location}</strong>
           </div>
           <div className="card stack-md" style={{ gap: "4px" }}>
              <span className="label">Impact Milestone</span>
              <strong className="h3">{charity.impactMetric}</strong>
           </div>
           <div className="card stack-md" style={{ gap: "4px", borderColor: "var(--accent)" }}>
              <span className="label text-accent">Active Selection</span>
              <p className="label" style={{ margin: 0 }}>Eligible for direct membership contributions.</p>
           </div>
        </section>

        <div className="grid-system grid-cols-2" style={{ alignItems: "start", gap: "32px" }}>
          <div className="stack-md" style={{ gap: "32px" }}>
            <article className="card stack-md">
              <h2 className="h2">The Mission</h2>
              <p className="body text-muted">{charity.description}</p>
              <div className="flex-row" style={{ gap: "8px" }}>
                 {charity.tags.map((tag) => (
                   <span key={tag} className="label" style={{ background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: "100px" }}>{tag}</span>
                 ))}
              </div>
            </article>

            <article className="card stack-md">
              <h2 className="h2">Scheduled Events</h2>
              <div className="stack-md" style={{ gap: "0" }}>
                 {charity.events.map((e) => (
                   <div key={e.id} className="flex-between" style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                     <div className="stack-md" style={{ gap: "4px" }}>
                       <strong className="h3" style={{ fontSize: "16px" }}>{e.title}</strong>
                       <span className="label">{e.venue}</span>
                     </div>
                     <span className="label text-accent">{e.date}</span>
                   </div>
                 ))}
              </div>
            </article>
          </div>

          <aside>
             <DonationForm
               charityId={charity.id}
               charityName={charity.name}
               currencyCode={database.settings.currencyCode}
               isLoggedIn={!!user}
             />
          </aside>
        </div>
      </div>
    </main>
  );
}
