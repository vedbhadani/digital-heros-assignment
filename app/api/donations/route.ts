import { NextResponse } from "next/server";

import {
  buildDashboardPayload,
  createIndependentDonationRecord,
} from "@/lib/business-rules";
import { createCheckoutSession } from "@/lib/integrations";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserRecord();
    const payload = (await request.json()) as {
      amountCents: number;
      charityId: string;
      donorEmail?: string;
      donorName?: string;
      message?: string;
    };

    if (!payload.amountCents || !payload.charityId) {
      return NextResponse.json({ error: "Amount and charity are required." }, { status: 400 });
    }

    const adminPayload = await updateDatabase(async (database) => {
      const charity = database.charities.find((c) => c.id === payload.charityId);
      if (!charity) {
        throw new Error("Charity not found.");
      }

      const checkout = await createCheckoutSession({
        amountCents: payload.amountCents,
        cancelPath: user ? "/dashboard" : "/charities",
        charityName: charity.name,
        customerEmail: user?.email || payload.donorEmail || "guest@example.com",
        intent: "donation",
        metadata: {
          charityId: charity.id,
          userId: user?.id || "guest",
        },
        successPath: user ? "/dashboard" : "/charities",
      });

      const donation = createIndependentDonationRecord({
        amountCents: payload.amountCents,
        charityId: charity.id,
        checkoutReference: checkout.checkoutReference,
        checkoutUrl: checkout.checkoutUrl,
        donorEmail: user?.email || payload.donorEmail || "guest@example.com",
        donorName: user?.fullName || payload.donorName || "Anonymous Guest",
        message: payload.message,
        paymentProvider: checkout.provider,
        status: checkout.provider === "stripe_mock" ? "paid" : "pending",
        subscriberUserId: user?.id || null,
      });

      database.donations.push(donation);

      return {
        checkoutUrl: checkout.checkoutUrl,
        donationId: donation.id,
      };
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process donation." },
      { status: 400 }
    );
  }
}
