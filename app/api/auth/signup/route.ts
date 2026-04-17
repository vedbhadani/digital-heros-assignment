import { NextResponse } from "next/server";
import crypto from "crypto";

import { createSessionToken, getSessionCookieOptions, hashPassword, sessionCookieName } from "@/lib/auth";
import { createNewUserRecord } from "@/lib/business-rules";
import { toPublicUser } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      about?: string;
      charityId?: string;
      country?: string;
      email?: string;
      fullName?: string;
      password?: string;
      percentage?: number;
      plan?: "monthly" | "yearly";
    };

    if (!payload.fullName || !payload.email || !payload.password || !payload.charityId || !payload.plan) {
      return NextResponse.json({ error: "Please complete every required signup field." }, { status: 400 });
    }

    const fullName = payload.fullName.trim();
    const email = payload.email.toLowerCase();
    const password = payload.password;
    const charityId = payload.charityId;
    const plan = payload.plan;

    const user = await updateDatabase((database) => {
      if (database.users.some((candidate) => candidate.email.toLowerCase() === email)) {
        throw new Error("An account with that email already exists.");
      }

      if (!database.charities.some((charity) => charity.id === charityId && charity.active)) {
        throw new Error("Please choose an active charity.");
      }

      const percentage = Number(payload.percentage ?? database.settings.minimumCharityPercentage);
      if (percentage < database.settings.minimumCharityPercentage) {
        throw new Error(`Charity contribution must be at least ${database.settings.minimumCharityPercentage}%.`);
      }

      const newUser = createNewUserRecord({
        about: payload.about?.trim() || "New subscriber ready to track scores and support charity impact.",
        charityId,
        country: payload.country?.trim() || "United States",
        email,
        fullName,
        passwordHash: hashPassword(password),
        percentage,
        plan,
        settings: database.settings
      });

      database.users.push(newUser);
      database.notifications.unshift({
        audience: "user",
        body: "Start by setting your donation percentage, then keep your latest five Stableford scores current for the next draw.",
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        preview: "Your account is ready for subscriptions, score entry, and draw access.",
        status: "sent",
        subject: `Welcome to ${database.settings.appName}`,
        type: "welcome",
        userId: newUser.id
      });

      return newUser;
    });

    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(sessionCookieName, createSessionToken(user.id, user.role), getSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the account." },
      { status: 400 }
    );
  }
}
