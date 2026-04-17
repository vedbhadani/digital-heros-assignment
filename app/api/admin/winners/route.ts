import { NextResponse } from "next/server";

import crypto from "crypto";

import { buildAdminPayload } from "@/lib/business-rules";
import { drawTierLabels } from "@/lib/display";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";
import type { DrawTierKey } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      drawId?: string;
      paymentStatus?: "pending" | "paid";
      reviewNotes?: string;
      tier?: DrawTierKey;
      verificationStatus?: "pending" | "approved" | "rejected";
      winnerId?: string;
    };

    const adminPayload = await updateDatabase((database) => {
      const draw = database.draws.find((candidate) => candidate.id === payload.drawId);
      if (!draw || !payload.tier) {
        throw new Error("Winner record was not found.");
      }

      const winner = draw.tiers[payload.tier].winners.find((candidate) => candidate.id === payload.winnerId);
      if (!winner) {
        throw new Error("Winner record was not found.");
      }

      winner.paymentStatus = payload.paymentStatus ?? winner.paymentStatus;
      winner.verificationStatus = payload.verificationStatus ?? winner.verificationStatus;
      winner.reviewNotes = payload.reviewNotes ?? winner.reviewNotes;
      winner.reviewedAt = new Date().toISOString();

      database.notifications.unshift({
        audience: "user",
        body: `Your ${drawTierLabels[payload.tier]} record in ${draw.label} has been updated by the admin team.`,
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        preview: `Verification is now ${winner.verificationStatus} and payment is ${winner.paymentStatus}.`,
        status: "sent",
        subject: "Winner verification updated",
        type: "verification",
        userId: winner.userId
      });

      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the winner state." },
      { status: 400 }
    );
  }
}
