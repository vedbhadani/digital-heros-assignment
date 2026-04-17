import { NextResponse } from "next/server";

import {
  addScoreToUser,
  buildAdminPayload,
  deleteScoreForUser,
  editScoreForUser,
  updateSubscription
} from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      about?: string;
      action?: "profile" | "subscription" | "score_add" | "score_edit" | "score_delete";
      country?: string;
      date?: string;
      fullName?: string;
      plan?: "monthly" | "yearly";
      score?: number;
      scoreId?: string;
      status?: "active" | "inactive" | "cancelled" | "lapsed";
      userId?: string;
    };

    const adminPayload = await updateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === payload.userId);
      if (!user) {
        throw new Error("User not found.");
      }

      switch (payload.action) {
        case "profile":
          user.fullName = payload.fullName?.trim() || user.fullName;
          user.country = payload.country?.trim() || user.country;
          user.about = payload.about?.trim() || user.about;
          break;
        case "subscription":
          updateSubscription(
            user,
            payload.plan ?? user.subscription.plan,
            payload.status ?? user.subscription.status,
            database.settings
          );
          break;
        case "score_add":
          addScoreToUser(user, payload.date ?? "", Number(payload.score));
          break;
        case "score_edit":
          editScoreForUser(user, payload.scoreId ?? "", payload.date ?? "", Number(payload.score));
          break;
        case "score_delete":
          deleteScoreForUser(user, payload.scoreId ?? "");
          break;
        default:
          throw new Error("Unsupported admin user action.");
      }

      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the user." },
      { status: 400 }
    );
  }
}

