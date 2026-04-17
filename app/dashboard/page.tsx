import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { buildDashboardPayload } from "@/lib/business-rules";
import { requireUser } from "@/lib/session";
import { readDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "admin") {
    redirect("/admin");
  }

  const database = await readDatabase();
  const initialData = buildDashboardPayload(database, user.id);

  return <DashboardShell initialData={initialData} />;
}

