"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatMoney } from "@/lib/display";
import type { AppSettings, CharityRecord, PublicUserRecord } from "@/lib/types";

type AuthFormProps = {
  charities?: CharityRecord[];
  minimumCharityPercentage?: number;
  mode: "login" | "signup";
  settings?: AppSettings;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

export function AuthForm({ charities = [], minimumCharityPercentage = 10, mode, settings }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("United States");
  const [about, setAbout] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [charityId, setCharityId] = useState(charities[0]?.id ?? "");
  const [percentage, setPercentage] = useState(minimumCharityPercentage);

  const selectedCharity = charities.find((charity) => charity.id === charityId) ?? charities[0];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { about, charityId, country, email, fullName, password, percentage, plan }
        ),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      const payload = await parseResponse<{ user: PublicUserRecord }>(response);
      startTransition(() => {
        router.push(payload.user.role === "admin" ? "/admin" : "/dashboard");
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    }
  }

  return (
    <main className="landing-shell">
      <div className="landing-shell__veil" />
      
      <div className="container-main section">
        <div className="grid-system grid-cols-2" style={{ alignItems: "start", gap: "48px" }}>
          {/* FORM PANEL */}
          <section className="card stack-md" style={{ gap: "32px" }}>
             <div className="stack-md" style={{ gap: "8px" }}>
               <Link className="label text-accent" href="/">← Back to home</Link>
               <h1 className="h1">{mode === "login" ? "Sign In" : "Get Started"}</h1>
               <p className="body text-muted">Join the fair-first competition for charitable impact.</p>
             </div>

             {error && <div className="card" style={{ borderColor: "var(--danger)", padding: "12px 16px" }}>{error}</div>}

             <form className="stack-md" style={{ gap: "24px" }} onSubmit={handleSubmit}>
                <div className="stack-md">
                  {mode === "signup" && (
                    <div className="grid-system grid-cols-2" style={{ gap: "16px" }}>
                      <div className="stack-md" style={{ gap: "4px" }}>
                        <span className="label">Full Name</span>
                        <input className="input" onChange={(e) => setFullName(e.target.value)} required value={fullName} />
                      </div>
                      <div className="stack-md" style={{ gap: "4px" }}>
                        <span className="label">Country</span>
                        <input className="input" onChange={(e) => setCountry(e.target.value)} value={country} />
                      </div>
                    </div>
                  )}

                  <div className="stack-md" style={{ gap: "4px" }}>
                    <span className="label">Email Address</span>
                    <input className="input" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
                  </div>

                  <div className="stack-md" style={{ gap: "4px" }}>
                    <span className="label">Password</span>
                    <input className="input" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
                  </div>

                  {mode === "signup" && (
                    <>
                      <div className="grid-system grid-cols-2" style={{ gap: "16px" }}>
                        <div className="stack-md" style={{ gap: "4px" }}>
                          <span className="label">Member Tier</span>
                          <select className="input" onChange={(e) => setPlan(e.target.value as any)} value={plan}>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly Saver</option>
                          </select>
                        </div>
                        <div className="stack-md" style={{ gap: "4px" }}>
                          <span className="label">Initial Cause</span>
                          <select className="input" onChange={(e) => setCharityId(e.target.value)} required value={charityId}>
                            {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="stack-md" style={{ gap: "4px" }}>
                        <span className="label">Impact Allocation (Min {minimumCharityPercentage}%)</span>
                        <input className="input" min={minimumCharityPercentage} onChange={(e) => setPercentage(Number(e.target.value))} type="number" value={percentage} />
                      </div>
                    </>
                  )}
                </div>

                <div className="stack-md" style={{ gap: "16px" }}>
                  <button className="btn-primary" style={{ width: "100%" }} disabled={isPending} type="submit">
                    {isPending ? "Authenticating..." : mode === "login" ? "Enter Dashboard" : "Create My Account"}
                  </button>
                  <p className="label" style={{ textAlign: "center" }}>
                    {mode === "login" ? "New to the club?" : "Already a member?"}{" "}
                    <Link className="text-accent" href={mode === "login" ? "/signup" : "/login"}>
                      {mode === "login" ? "Sign up here" : "Sign in here"}
                    </Link>
                  </p>
                </div>
             </form>
          </section>

          {/* ASIDE / CREDENTIALS */}
          <aside className="stack-md" style={{ gap: "32px" }}>
            <div className="card stack-md" style={{ gap: "12px" }}>
               <span className="label text-accent">Developer Sandbox Access</span>
               <div className="stack-md" style={{ gap: "4px" }}>
                 <p className="label text-muted">Subscriber</p>
                 <code style={{ fontSize: "12px", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "4px" }}>sophie@fairchance.club / DemoPass123!</code>
               </div>
               <div className="stack-md" style={{ gap: "4px" }}>
                 <p className="label text-muted">Administrator</p>
                 <code style={{ fontSize: "12px", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "4px" }}>admin@fairchance.club / AdminPass123!</code>
               </div>
            </div>

            {selectedCharity && (
              <div className="card stack-md" style={{ background: selectedCharity.visual.mesh, borderColor: selectedCharity.visual.accent }}>
                <span className="label" style={{ color: selectedCharity.visual.accent }}>Selected Cause</span>
                <h3 className="h3">{selectedCharity.name}</h3>
                <p className="body text-muted" style={{ fontSize: "14px" }}>{selectedCharity.shortDescription}</p>
                <div className="flex-between">
                   <span className="label">{selectedCharity.location}</span>
                   <span className="label" style={{ color: selectedCharity.visual.accent }}>{selectedCharity.impactMetric}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
