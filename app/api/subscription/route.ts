import { NextResponse } from "next/server";
import crypto from "crypto";

import { buildDashboardPayload, updateSubscription } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      plan?: "monthly" | "yearly";
      status?: "active" | "cancelled";
    };

    const dashboard = await updateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === currentUser.id);
      if (!user) {
        throw new Error("User account was not found.");
      }

      updateSubscription(
        user,
        payload.plan ?? user.subscription.plan,
        payload.status ?? user.subscription.status,
        database.settings
      );

      database.notifications.unshift({
        audience: "user",
        body:
          user.subscription.status === "active"
            ? "Your plan is active and your score-entry access remains open."
            : "Your plan has been cancelled. You can reactivate any time from the dashboard.",
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        preview: `Plan updated to ${user.subscription.plan}.`,
        status: "sent",
        subject: "Subscription updated",
        type: "subscription",
        userId: user.id
      });

      return buildDashboardPayload(database, user.id);
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the subscription." },
      { status: 400 }
    );
  }
}
