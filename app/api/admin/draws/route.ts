import { NextResponse } from "next/server";

import { buildAdminPayload, runDraw } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      logic?: "random" | "algorithmic";
      mode?: "simulate" | "publish";
    };

    const adminPayload = await updateDatabase((database) => {
      runDraw(database, payload.logic ?? "algorithmic", payload.mode !== "publish");
      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the draw." },
      { status: 400 }
    );
  }
}

