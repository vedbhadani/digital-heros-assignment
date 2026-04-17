import { NextResponse } from "next/server";

import { buildAdminPayload } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { readDatabase } from "@/lib/store";

export async function GET() {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  }

  const database = await readDatabase();
  return NextResponse.json(buildAdminPayload(database, currentUser.id));
}

