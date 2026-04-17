"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { drawTierLabels, formatMoney } from "@/lib/display";
import type {
  AdminPayload,
  DrawTierKey,
  PublicUserRecord,
  ScoreEntry,
  SubscriptionPlan,
  SubscriptionStatus
} from "@/lib/types";

type AdminShellProps = {
  initialData: AdminPayload;
};

type UserDraft = {
  about: string;
  country: string;
  fullName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
};

type NewCharityDraft = {
  category: string;
  description: string;
  impactMetric: string;
  location: string;
  name: string;
  shortDescription: string;
  tags: string;
};

function buildUserDrafts(users: PublicUserRecord[]): Record<string, UserDraft> {
  return Object.fromEntries(
    users.map((user) => [
      user.id,
      {
        about: user.about,
        country: user.country,
        fullName: user.fullName,
        plan: user.subscription.plan,
        status: user.subscription.status
      }
    ])
  );
}

function buildCharityDrafts(data: AdminPayload): Record<string, { category: string; impactMetric: string }> {
  return Object.fromEntries(
    data.charities.map((charity) => [
      charity.id,
      {
        category: charity.category,
        impactMetric: charity.impactMetric
      }
    ])
  );
}

function flattenWinners(data: AdminPayload) {
  const userMap = new Map(data.users.map((user) => [user.id, user]));

  return data.draws.flatMap((draw) =>
    (Object.keys(draw.tiers) as DrawTierKey[]).flatMap((tier) =>
      draw.tiers[tier].winners.map((winner) => ({
        drawId: draw.id,
        drawLabel: draw.label,
        proofImage: winner.proofImage,
        reviewNotes: winner.reviewNotes ?? "",
        tier,
        user: userMap.get(winner.userId),
        verificationStatus: winner.verificationStatus,
        winnerId: winner.id,
        paymentStatus: winner.paymentStatus,
        amountCents: winner.amountCents
      }))
    )
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

export function AdminShell({ initialData }: AdminShellProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawLogic, setDrawLogic] = useState<"random" | "algorithmic">("algorithmic");
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>(() => buildUserDrafts(initialData.users));
  const [charityDrafts, setCharityDrafts] = useState<Record<string, { category: string; impactMetric: string }>>(() => buildCharityDrafts(initialData));
  const [winnerNotes, setWinnerNotes] = useState<Record<string, string>>({});
  const [newCharity, setNewCharity] = useState<NewCharityDraft>({
    category: "", description: "", impactMetric: "", location: "", name: "", shortDescription: "", tags: ""
  });

  useEffect(() => {
    setUserDrafts(buildUserDrafts(data.users));
    setCharityDrafts(buildCharityDrafts(data));
  }, [data]);

  const subscriberUsers = data.users.filter((user) => user.role === "subscriber");
  const winners = flattenWinners(data);
  const upcomingDraw = data.draws.find((draw) => draw.status === "scheduled") ?? null;

  async function mutate(input: Promise<AdminPayload>, successMessage: string) {
    setError(null);
    try {
      const nextData = await input;
      startTransition(() => {
        setData(nextData);
        setMessage(successMessage);
      });
    } catch (caughtError) {
      setMessage(null);
      setError(caughtError instanceof Error ? caughtError.message : "Request failed.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="container-main section stack-md" style={{ gap: "32px" }}>
      <header className="flex-between">
        <div className="stack-md" style={{ gap: "4px" }}>
          <Link className="label text-accent" href="/">← Home</Link>
          <h1 className="h1">{data.admin.fullName}</h1>
          <p className="body text-muted">Platform Control Center</p>
        </div>
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </header>

      {/* NOTICES */}
      <div className="stack-md" style={{ gap: "8px" }}>
        {message && <div className="card" style={{ borderColor: "var(--mint)", padding: "12px 16px" }}>{message}</div>}
        {error && <div className="card" style={{ borderColor: "var(--danger)", padding: "12px 16px" }}>{error}</div>}
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid-system grid-cols-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
         <div className="card stack-md" style={{ gap: "4px" }}>
           <span className="label">Total Users</span>
           <h2 className="h2">{data.analytics.totalUsers}</h2>
           <p className="label">{data.analytics.activeSubscribers} active subs</p>
         </div>
         <div className="card stack-md" style={{ gap: "4px" }}>
           <span className="label">Monthly Pool</span>
           <h2 className="h2">{formatMoney(data.analytics.totalPrizePoolCents, data.settings.currencyCode)}</h2>
           <p className="label">{data.analytics.publishedDrawCount} cycles</p>
         </div>
         <div className="card stack-md" style={{ gap: "4px" }}>
           <span className="label">Cause Impact</span>
           <h2 className="h2">{formatMoney(data.analytics.charityContributionCents + data.analytics.independentDonationCents, data.settings.currencyCode)}</h2>
           <p className="label">Cumulative total</p>
         </div>
         <div className="card stack-md" style={{ gap: "4px" }}>
           <span className="label">Pending Queue</span>
           <h2 className="h2">{data.analytics.verificationQueueCount}</h2>
           <p className="label">Reviews needed</p>
         </div>
      </div>

      <div className="grid-system grid-cols-2">
        {/* DRAW ENGINE */}
        <article className="card stack-md" style={{ gridColumn: "span 2", gap: "24px" }}>
          <div className="stack-md" style={{ gap: "4px" }}>
            <h2 className="h2">Monthly Draw Cycle</h2>
            <p className="body text-muted">Control the simulation and publication of the monthly draw result.</p>
          </div>

          {upcomingDraw ? (
            <div className="stack-md" style={{ gap: "24px" }}>
              <div className="flex-between">
                <div className="stack-md" style={{ gap: "4px" }}>
                  <strong className="h3">{upcomingDraw.label}</strong>
                  <span className="label text-accent">{formatMoney(upcomingDraw.prizePoolCents, data.settings.currencyCode)} in pool</span>
                </div>
                <div className="flex-row">
                   <select className="input" style={{ width: "160px" }} onChange={(e) => setDrawLogic(e.target.value as any)} value={drawLogic}>
                     <option value="algorithmic">Algorithmic</option>
                     <option value="random">Random</option>
                   </select>
                   <button className="btn-ghost" disabled={isPending} onClick={() => mutate(
                     fetch("/api/admin/draws", { body: JSON.stringify({ logic: drawLogic, mode: "simulate" }), headers: { "Content-Type": "application/json" }, method: "POST" }).then(parseResponse<AdminPayload>),
                     "Simulation refreshed."
                   )}>Run Sim</button>
                   <button className="btn-primary" disabled={isPending} onClick={() => mutate(
                     fetch("/api/admin/draws", { body: JSON.stringify({ logic: drawLogic, mode: "publish" }), headers: { "Content-Type": "application/json" }, method: "POST" }).then(parseResponse<AdminPayload>),
                     "Draw published."
                   )}>Publish Result</button>
                </div>
              </div>

              {upcomingDraw.simulation && (
                <div className="card stack-md" style={{ background: "rgba(255,255,255,0.02)" }}>
                   <span className="label">Simulation Snapshot</span>
                   <div className="flex-row" style={{ gap: "8px" }}>
                     {upcomingDraw.simulation.numbers.map((n, i) => <div key={i} className="card" style={{ padding: "8px 12px", minWidth: "44px", textAlign: "center" }}>{n}</div>)}
                   </div>
                   <div className="grid-system grid-cols-3">
                      {Object.keys(upcomingDraw.simulation.tiers).map((tierKey: any) => (
                        <div key={tierKey} className="stack-md" style={{ gap: "4px" }}>
                          <span className="label">{drawTierLabels[tierKey as DrawTierKey]}</span>
                          <strong className="h3">{formatMoney(upcomingDraw.simulation!.tiers[tierKey as DrawTierKey].projectedAmountEachCents, data.settings.currencyCode)}</strong>
                          <p className="label">{upcomingDraw.simulation!.tiers[tierKey as DrawTierKey].winnerIds.length} projected winners</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          ) : <p className="body text-muted">No scheduled draw cycle active.</p>}
        </article>

        {/* USER LIST */}
        <article className="card stack-md" style={{ gridColumn: "span 2", gap: "24px" }}>
          <h2 className="h2">Subscriber Directory</h2>
          <div className="stack-md">
             {subscriberUsers.map((u) => (
               <div key={u.id} className="card stack-md" style={{ background: "rgba(255,255,255,0.02)" }}>
                 <div className="flex-between">
                   <div className="stack-md" style={{ gap: "4px" }}>
                      <strong className="h3">{u.fullName}</strong>
                      <span className="label">{u.email}</span>
                   </div>
                   <span className="label" style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>{u.subscription.status}</span>
                 </div>
                 
                 <div className="grid-system grid-cols-2">
                   <div className="input-field stack-md" style={{ gap: "4px" }}>
                      <span className="label">Member Name</span>
                      <input className="input" onChange={(e) => setUserDrafts(c => ({...c, [u.id]: {...c[u.id], fullName: e.target.value}}))} value={userDrafts[u.id]?.fullName} />
                   </div>
                   <div className="input-field stack-md" style={{ gap: "4px" }}>
                      <span className="label">Tier / Status</span>
                      <div className="flex-row" style={{ gap: "8px" }}>
                        <select className="input" style={{ flex: 1 }} onChange={(e) => setUserDrafts(c => ({...c, [u.id]: {...c[u.id], plan: e.target.value as any}}))} value={userDrafts[u.id]?.plan}>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                        <select className="input" style={{ flex: 1 }} onChange={(e) => setUserDrafts(c => ({...c, [u.id]: {...c[u.id], status: e.target.value as any}}))} value={userDrafts[u.id]?.status}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                   </div>
                 </div>
                 <button className="btn-primary" style={{ width: "fit-content" }} onClick={() => mutate(
                   fetch("/api/admin/users", { body: JSON.stringify({ action: "profile", ...userDrafts[u.id], userId: u.id }), headers: { "Content-Type": "application/json" }, method: "PATCH" }).then(parseResponse<AdminPayload>),
                   "User updated."
                 )}>Save Profile Changes</button>
               </div>
             ))}
          </div>
        </article>

        {/* VERIFICATION QUEUE */}
        <article className="card stack-md" style={{ gridColumn: "span 2", gap: "24px" }}>
          <h2 className="h2">Winner Verification Review</h2>
          <div className="stack-md">
            {winners.map((win) => (
              <div key={win.winnerId} className="card stack-md" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-between">
                   <div className="stack-md" style={{ gap: "4px" }}>
                      <strong className="h3">{win.user?.fullName}</strong>
                      <p className="label">{win.drawLabel} · {drawTierLabels[win.tier]} · {formatMoney(win.amountCents, data.settings.currencyCode)}</p>
                   </div>
                   <span className="label text-accent">{win.verificationStatus} review queue</span>
                </div>
                
                {win.proofImage && <img alt="Proof" className="card" style={{ width: "100%", maxHeight: "320px", objectFit: "contain", padding: "8px" }} src={win.proofImage} />}
                
                <div className="grid-system grid-cols-2" style={{ alignItems: "end" }}>
                   <div className="stack-md" style={{ gap: "8px" }}>
                      <div className="input-field stack-md" style={{ gap: "4px" }}>
                        <span className="label">Verification State</span>
                        <select className="input" defaultValue={win.verificationStatus} onChange={(e) => setWinnerNotes(c => ({...c, [`${win.winnerId}:verification`]: e.target.value}))}>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                   </div>
                   <button className="btn-primary" onClick={() => mutate(
                     fetch("/api/admin/winners", {
                       body: JSON.stringify({
                         drawId: win.drawId, winnerId: win.winnerId, tier: win.tier,
                         verificationStatus: winnerNotes[`${win.winnerId}:verification`] ?? win.verificationStatus,
                         paymentStatus: winnerNotes[`${win.winnerId}:payment`] ?? win.paymentStatus,
                         reviewNotes: winnerNotes[win.winnerId] ?? win.reviewNotes
                       }),
                       headers: { "Content-Type": "application/json" }, method: "PATCH"
                     }).then(parseResponse<AdminPayload>),
                     "State updated."
                   )}>Commit Status Change</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
