"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatMoney } from "@/lib/display";

type DonationFormProps = {
  charityId: string;
  charityName: string;
  currencyCode: string;
  isLoggedIn: boolean;
};

export function DonationForm({ charityId, charityName, currencyCode, isLoggedIn }: DonationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number>(25);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const presets = [10, 25, 50, 100];

  async function handleDonate() {
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/donations", {
        body: JSON.stringify({
          amountCents: amount * 100,
          charityId,
          donorEmail: isLoggedIn ? undefined : donorEmail,
          donorName: isLoggedIn ? undefined : donorName,
          message,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setSuccess(true);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    }
  }

  if (success) {
    return (
      <div className="card stack-md" style={{ padding: "32px", textAlign: "center" }}>
        <h3 className="h3 text-accent">Impact Confirmed</h3>
        <p className="body text-muted">Your direct support for {charityName} has been processed successfully.</p>
        <button className="btn-ghost" onClick={() => setSuccess(false)}>Make another donation</button>
      </div>
    );
  }

  return (
    <article className="card stack-md" style={{ gap: "24px" }}>
      <div className="stack-md" style={{ gap: "4px" }}>
        <h2 className="h2">Direct Support</h2>
        <p className="body text-muted">100% of this contribution is routed to {charityName}.</p>
      </div>

      <div className="stack-md" style={{ gap: "16px" }}>
        {error && <div className="card" style={{ borderColor: "var(--danger)", padding: "12px 16px" }}>{error}</div>}

        <div className="grid-system" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
           {presets.map((p) => (
              <button
                key={p}
                className={amount === p ? "btn-primary" : "btn-ghost"}
                onClick={() => setAmount(p)}
                style={{ height: "40px", padding: 0 }}
                type="button"
              >
                {formatMoney(p * 100, currencyCode)}
              </button>
           ))}
        </div>

        <div className="stack-md" style={{ gap: "4px" }}>
          <span className="label">Custom Amount ({currencyCode})</span>
          <input className="input" min={1} onChange={(e) => setAmount(Number(e.target.value))} type="number" value={amount} />
        </div>

        {!isLoggedIn && (
           <div className="grid-system grid-cols-2" style={{ gap: "12px" }}>
              <div className="stack-md" style={{ gap: "4px" }}>
                <span className="label">Full Name</span>
                <input className="input" onChange={(e) => setDonorName(e.target.value)} placeholder="Jane Doe" type="text" value={donorName} />
              </div>
              <div className="stack-md" style={{ gap: "4px" }}>
                <span className="label">Email</span>
                <input className="input" onChange={(e) => setDonorEmail(e.target.value)} placeholder="jane@example.com" type="email" value={donorEmail} />
              </div>
           </div>
        )}

        <div className="stack-md" style={{ gap: "4px" }}>
          <span className="label">Support Note (Optional)</span>
          <textarea className="input" onChange={(e) => setMessage(e.target.value)} rows={2} style={{ height: "auto", padding: "12px" }} value={message} />
        </div>

        <button className="btn-primary" disabled={isPending} onClick={handleDonate} style={{ width: "100%", marginTop: "8px" }} type="button">
          {isPending ? "Connecting..." : `Donate ${formatMoney(amount * 100, currencyCode)}`}
        </button>
      </div>
    </article>
  );
}
