import { NextResponse } from "next/server";

import { buildDashboardPayload, updateCharitySelection } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      charityId?: string;
      percentage?: number;
    };

    const dashboard = await updateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === currentUser.id);
      if (!user) {
        throw new Error("User not found.");
      }

      if (!database.charities.some((charity) => charity.id === payload.charityId && charity.active)) {
        throw new Error("Please choose an active charity.");
      }

      updateCharitySelection(
        user,
        payload.charityId ?? user.charitySelection.charityId,
        Number(payload.percentage ?? user.charitySelection.percentage),
        database.settings.minimumCharityPercentage
      );

      return buildDashboardPayload(database, user.id);
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update charity selection." },
      { status: 400 }
    );
  }
}

