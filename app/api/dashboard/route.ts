import { NextResponse } from "next/server";

import { buildDashboardPayload } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { readDatabase } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUserRecord();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const database = await readDatabase();
  return NextResponse.json(buildDashboardPayload(database, user.id));
}

