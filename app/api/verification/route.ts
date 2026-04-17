import { NextResponse } from "next/server";

import crypto from "crypto";

import { buildDashboardPayload } from "@/lib/business-rules";
import { drawTierLabels } from "@/lib/display";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";
import type { DrawTierKey } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      drawId?: string;
      proofImage?: string;
      tier?: DrawTierKey;
    };

    const dashboard = await updateDatabase((database) => {
      const draw = database.draws.find((candidate) => candidate.id === payload.drawId);
      if (!draw || !payload.tier) {
        throw new Error("Draw result was not found.");
      }

      const winner = draw.tiers[payload.tier].winners.find((candidate) => candidate.userId === currentUser.id);
      if (!winner) {
        throw new Error("Winner record not found for this account.");
      }

      if (!payload.proofImage) {
        throw new Error("Please upload a screenshot before submitting.");
      }

      winner.proofImage = payload.proofImage;
      winner.proofSubmittedAt = new Date().toISOString();
      winner.verificationStatus = "pending";
      winner.paymentStatus = "pending";
      winner.reviewNotes = "Awaiting admin review.";
      winner.reviewedAt = null;

      database.notifications.unshift({
        audience: "admin",
        body: `${currentUser.fullName} submitted proof for the ${drawTierLabels[payload.tier]} tier in ${draw.label}.`,
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        preview: "New winner proof uploaded for review.",
        status: "sent",
        subject: "Winner verification submitted",
        type: "verification",
        userId: null
      });

      return buildDashboardPayload(database, currentUser.id);
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit verification." },
      { status: 400 }
    );
  }
}
