"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { drawTierLabels, formatMoney } from "@/lib/display";
import type { DashboardPayload, DashboardWinnerSummary, DrawTierKey, ScoreEntry } from "@/lib/types";

type DashboardShellProps = {
  initialData: DashboardPayload;
};

type ScoreDraft = {
  date: string;
  score: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function buildWinnerKey(item: DashboardWinnerSummary): string {
  return `${item.drawId}:${item.tier}`;
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState(data.viewer.subscription.plan);
  const [charityDraft, setCharityDraft] = useState(data.viewer.charitySelection.charityId);
  const [percentageDraft, setPercentageDraft] = useState(data.viewer.charitySelection.percentage);
  const [newScore, setNewScore] = useState<ScoreDraft>({ date: "", score: 36 });
  const [proofDrafts, setProofDrafts] = useState<Record<string, string>>({});

  const pendingProofWins = data.winnings.filter((item) => item.paymentStatus === "pending");

  async function mutate(input: Promise<DashboardPayload>, successMessage: string, options?: { resetNewScore?: boolean }) {
    setError(null);
    try {
      const nextData = await input;
      startTransition(() => {
        setData(nextData);
        setMessage(successMessage);
        if (options?.resetNewScore) setNewScore({ date: "", score: 36 });
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
          <h1 className="h1">{data.viewer.fullName}</h1>
          <p className="body text-muted">Subscriber Dashboard</p>
        </div>
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </header>

      {/* NOTICES */}
      <div className="stack-md" style={{ gap: "8px" }}>
        {message && <div className="card" style={{ borderColor: "var(--mint)", padding: "12px 16px" }}>{message}</div>}
        {error && <div className="card" style={{ borderColor: "var(--danger)", padding: "12px 16px" }}>{error}</div>}
      </div>

      {/* TOP METRICS */}
      <div className="grid-system grid-cols-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="card stack-md" style={{ gap: "4px" }}>
          <span className="label">Status</span>
          <h2 className="h2">{data.viewer.subscription.status}</h2>
          <p className="label">{data.viewer.subscription.plan} plan</p>
        </div>
        <div className="card stack-md" style={{ gap: "4px" }}>
          <span className="label">Impact Contribution</span>
          <h2 className="h2">{formatMoney(data.charityContributionCents + data.independentDonationTotalCents, data.settings.currencyCode)}</h2>
          <p className="label">Total to causes</p>
        </div>
        <div className="card stack-md" style={{ gap: "4px" }}>
          <span className="label">Average Score</span>
          <h2 className="h2">{data.scoreAverage}</h2>
          <p className="label">Stableford points</p>
        </div>
      </div>

      <div className="grid-system grid-cols-2">
        {/* SUBSCRIPTION */}
        <article className="card stack-md" style={{ gap: "24px" }}>
          <div className="stack-md" style={{ gap: "4px" }}>
            <h3 className="h3">Membership Tier</h3>
            <p className="body text-muted">Manage your access level.</p>
          </div>
          <div className="stack-md">
            <select className="input" onChange={(e) => setPlanDraft(e.target.value as any)} value={planDraft}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button className="btn-primary" disabled={isPending} onClick={() => mutate(
              fetch("/api/subscription", {
                body: JSON.stringify({ plan: planDraft, status: "active" }),
                headers: { "Content-Type": "application/json" },
                method: "PATCH"
              }).then(parseResponse<DashboardPayload>),
              "Subscription updated."
            )}>Update Plan</button>
          </div>
        </article>

        {/* CHARITY */}
        <article className="card stack-md" style={{ gap: "24px" }}>
          <div className="stack-md" style={{ gap: "4px" }}>
            <h3 className="h3">Cause Allocation</h3>
            <p className="body text-muted">Update your target charity.</p>
          </div>
          <div className="stack-md">
            <div className="grid-system grid-cols-2" style={{ gap: "12px" }}>
              <select className="input" onChange={(e) => setCharityDraft(e.target.value)} value={charityDraft}>
                {data.charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input" min={data.settings.minimumCharityPercentage} onChange={(e) => setPercentageDraft(Number(e.target.value))} type="number" value={percentageDraft} />
            </div>
            <button className="btn-primary" disabled={isPending} onClick={() => mutate(
              fetch("/api/charity-selection", {
                body: JSON.stringify({ charityId: charityDraft, percentage: percentageDraft }),
                headers: { "Content-Type": "application/json" },
                method: "PATCH"
              }).then(parseResponse<DashboardPayload>),
              "Selection updated."
            )}>Save Selection</button>
          </div>
        </article>

        {/* SCORES */}
        <div className="card stack-md" style={{ gridColumn: "span 2", gap: "24px" }}>
          <div className="flex-between">
            <div className="stack-md" style={{ gap: "4px" }}>
              <h3 className="h3">Stableford Performance (Latest 5)</h3>
              <p className="body text-muted">Every new entry pushes out the oldest round.</p>
            </div>
            <div className="flex-row">
              <input className="input" onChange={(e) => setNewScore(c => ({...c, date: e.target.value}))} type="date" value={newScore.date} />
              <input className="input" max={45} min={1} onChange={(e) => setNewScore(c => ({...c, score: Number(e.target.value)}))} style={{ width: "80px" }} type="number" value={newScore.score} />
              <button className="btn-primary" disabled={isPending || !newScore.date} onClick={() => mutate(
                fetch("/api/scores", {
                  body: JSON.stringify(newScore),
                  headers: { "Content-Type": "application/json" },
                  method: "POST"
                }).then(parseResponse<DashboardPayload>),
                "Score recorded.",
                { resetNewScore: true }
              )}>Add Round</button>
            </div>
          </div>
          <div className="stack-md">
            {data.viewer.scores.map((s) => (
              <div key={s.id} className="card flex-between" style={{ padding: "12px 24px", background: "rgba(255,255,255,0.02)" }}>
                <strong className="h3">{s.score} pts</strong>
                <span className="label">{s.date}</span>
                <button className="btn-ghost" style={{ height: "32px", fontSize: "14px" }} onClick={() => mutate(
                  fetch("/api/scores", { body: JSON.stringify({ scoreId: s.id }), headers: { "Content-Type": "application/json" }, method: "DELETE" }).then(parseResponse<DashboardPayload>),
                  "Score removed."
                )}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* WINNINGS */}
        <div className="card stack-md" style={{ gridColumn: "span 2", gap: "24px" }}>
          <h3 className="h3">Winnings & Verification</h3>
          <div className="stack-md">
            {data.winnings.length ? data.winnings.map((w) => (
              <div key={buildWinnerKey(w)} className="card stack-md" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-between">
                  <div className="stack-md" style={{ gap: "4px" }}>
                    <strong>{w.drawLabel} · {drawTierLabels[w.tier]}</strong>
                    <span className="label text-accent">{formatMoney(w.amountCents, data.settings.currencyCode)} pending review</span>
                  </div>
                  <div className="flex-row">
                    <input accept="image/*" id={`proof-${buildWinnerKey(w)}`} onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = () => setProofDrafts(c => ({ ...c, [buildWinnerKey(w)]: String(reader.result) }));
                       reader.readAsDataURL(file);
                    }} style={{ display: "none" }} type="file" />
                    <label className="btn-ghost" htmlFor={`proof-${buildWinnerKey(w)}`}>Upload Screenshot</label>
                    <button className="btn-primary" disabled={!proofDrafts[buildWinnerKey(w)]} onClick={() => mutate(
                      fetch("/api/verification", {
                        body: JSON.stringify({ drawId: w.drawId, proofImage: proofDrafts[buildWinnerKey(w)], tier: w.tier }),
                        headers: { "Content-Type": "application/json" },
                        method: "POST"
                      }).then(parseResponse<DashboardPayload>),
                      "Proof submitted."
                    )}>Submit Verification</button>
                  </div>
                </div>
              </div>
            )) : <p className="body text-muted">No winning draws recorded yet.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
