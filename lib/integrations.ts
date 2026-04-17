import crypto from "crypto";

type CheckoutIntent = "subscription" | "donation";

type StripeCheckoutInput =
  | {
      cancelPath: string;
      customerEmail: string;
      intent: "subscription";
      metadata: Record<string, string>;
      plan: "monthly" | "yearly";
      successPath: string;
    }
  | {
      amountCents: number;
      cancelPath: string;
      charityName: string;
      customerEmail: string;
      intent: "donation";
      metadata: Record<string, string>;
      successPath: string;
    };

type StripeCheckoutResult = {
  checkoutReference: string | null;
  checkoutUrl: string | null;
  provider: string;
};

type EmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
}

export function paymentIntegrationEnabled() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_MONTHLY_PRICE_ID &&
      process.env.STRIPE_YEARLY_PRICE_ID
  );
}

export function emailDeliveryEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function createCheckoutSession(input: StripeCheckoutInput): Promise<StripeCheckoutResult> {
  if (!paymentIntegrationEnabled()) {
    return {
      checkoutReference: null,
      checkoutUrl: null,
      provider: "stripe_mock"
    };
  }

  const formData = new URLSearchParams();
  formData.set("success_url", `${getAppUrl()}${input.successPath}`);
  formData.set("cancel_url", `${getAppUrl()}${input.cancelPath}`);
  formData.set("customer_email", input.customerEmail);

  Object.entries(input.metadata).forEach(([key, value]) => {
    formData.set(`metadata[${key}]`, value);
  });

  if (input.intent === "subscription") {
    formData.set("mode", "subscription");
    formData.set(
      "line_items[0][price]",
      input.plan === "yearly" ? process.env.STRIPE_YEARLY_PRICE_ID! : process.env.STRIPE_MONTHLY_PRICE_ID!
    );
    formData.set("line_items[0][quantity]", "1");
  } else {
    formData.set("mode", "payment");
    formData.set("line_items[0][quantity]", "1");
    formData.set("line_items[0][price_data][currency]", "usd");
    formData.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
    formData.set("line_items[0][price_data][product_data][name]", `${input.charityName} donation`);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    body: formData,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  const payload = (await response.json()) as {
    error?: {
      message?: string;
    };
    id?: string;
    url?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error?.message || "Unable to create the Stripe checkout session.");
  }

  return {
    checkoutReference: payload.id ?? null,
    checkoutUrl: payload.url,
    provider: "stripe"
  };
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null): boolean {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function sendTransactionalEmail(input: EmailInput): Promise<void> {
  if (!emailDeliveryEnabled()) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: [input.to]
    }),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "Unable to deliver email.");
  }
}

export function buildNotificationEmailHtml(subject: string, preview: string, body: string) {
  return `
    <div style="background:#06110f;padding:32px;font-family:Avenir Next,Segoe UI,sans-serif;color:#f4f7ef">
      <div style="max-width:620px;margin:0 auto;background:#0b1c18;border-radius:24px;padding:32px;border:1px solid rgba(246,216,141,0.18)">
        <p style="letter-spacing:0.18em;text-transform:uppercase;font-size:12px;color:#89f2c0;margin:0 0 12px">Fair Chance Club</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 12px;font-size:32px;line-height:1.05">${subject}</h1>
        <p style="color:rgba(244,247,239,0.72);line-height:1.6;margin:0 0 16px">${preview}</p>
        <p style="color:#f4f7ef;line-height:1.7;margin:0">${body}</p>
      </div>
    </div>
  `;
}

