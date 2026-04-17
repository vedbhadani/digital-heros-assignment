import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { parseSessionToken, sessionCookieName } from "@/lib/auth";
import { readDatabase } from "@/lib/store";
import type { PublicUserRecord, UserRecord } from "@/lib/types";

export function toPublicUser(user: UserRecord): PublicUserRecord {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function getCurrentUserRecord(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = parseSessionToken(token);
  if (!session) {
    return null;
  }

  const database = await readDatabase();
  return database.users.find((user) => user.id === session.userId) ?? null;
}

export async function getCurrentUser(): Promise<PublicUserRecord | null> {
  const user = await getCurrentUserRecord();
  return user ? toPublicUser(user) : null;
}

export async function requireUser(): Promise<PublicUserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<PublicUserRecord> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
