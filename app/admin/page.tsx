import { AdminShell } from "@/components/admin-shell";
import { buildAdminPayload } from "@/lib/business-rules";
import { requireAdmin } from "@/lib/session";
import { readDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const database = await readDatabase();
  const initialData = buildAdminPayload(database, admin.id);

  return <AdminShell initialData={initialData} />;
}

