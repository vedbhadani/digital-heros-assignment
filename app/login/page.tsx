import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(currentUser.role === "admin" ? "/admin" : "/dashboard");
  }

  return <AuthForm mode="login" />;
}

