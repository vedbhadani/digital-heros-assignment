import { NextResponse } from "next/server";

import {
  addScoreToUser,
  assertSubscriberAccess,
  buildDashboardPayload,
  deleteScoreForUser,
  editScoreForUser
} from "@/lib/business-rules";
import { getCurrentUserRecord, toPublicUser } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

async function withSubscriberMutation(
  action: (userId: string, databaseUpdater: typeof updateDatabase) => Promise<unknown>
) {
  const user = await getCurrentUserRecord();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    assertSubscriberAccess(toPublicUser(user));
    const result = await action(user.id, updateDatabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update scores." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    date?: string;
    score?: number;
  };

  return withSubscriberMutation(async (userId, databaseUpdater) => {
    return databaseUpdater((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) {
        throw new Error("User not found.");
      }

      addScoreToUser(user, payload.date ?? "", Number(payload.score));
      return buildDashboardPayload(database, user.id);
    });
  });
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as {
    date?: string;
    score?: number;
    scoreId?: string;
  };

  return withSubscriberMutation(async (userId, databaseUpdater) => {
    return databaseUpdater((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) {
        throw new Error("User not found.");
      }

      editScoreForUser(user, payload.scoreId ?? "", payload.date ?? "", Number(payload.score));
      return buildDashboardPayload(database, user.id);
    });
  });
}

export async function DELETE(request: Request) {
  const payload = (await request.json()) as {
    scoreId?: string;
  };

  return withSubscriberMutation(async (userId, databaseUpdater) => {
    return databaseUpdater((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) {
        throw new Error("User not found.");
      }

      deleteScoreForUser(user, payload.scoreId ?? "");
      return buildDashboardPayload(database, user.id);
    });
  });
}

