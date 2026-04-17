import { NextResponse } from "next/server";

import { createSessionToken, getSessionCookieOptions, sessionCookieName, verifyPassword } from "@/lib/auth";
import { toPublicUser } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!payload.email || !payload.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await updateDatabase((database) => {
      const match = database.users.find((candidate) => candidate.email.toLowerCase() === payload.email!.toLowerCase());
      if (!match || !verifyPassword(payload.password!, match.passwordHash)) {
        throw new Error("Incorrect email or password.");
      }

      match.lastLoginAt = new Date().toISOString();
      return match;
    });

    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(sessionCookieName, createSessionToken(user.id, user.role), getSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 400 }
    );
  }
}

