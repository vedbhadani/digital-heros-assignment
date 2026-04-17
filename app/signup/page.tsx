import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { readDatabase } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(currentUser.role === "admin" ? "/admin" : "/dashboard");
  }

  const database = await readDatabase();

  return (
    <AuthForm
      charities={database.charities.filter((charity) => charity.active)}
      minimumCharityPercentage={database.settings.minimumCharityPercentage}
      mode="signup"
      settings={database.settings}
    />
  );
}

