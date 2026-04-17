import { NextResponse } from "next/server";
import crypto from "crypto";

import { buildAdminPayload } from "@/lib/business-rules";
import { getCurrentUserRecord } from "@/lib/session";
import { updateDatabase } from "@/lib/store";

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      category?: string;
      description?: string;
      impactMetric?: string;
      location?: string;
      mesh?: string;
      name?: string;
      shortDescription?: string;
      tags?: string[];
    };

    const adminPayload = await updateDatabase((database) => {
      if (!payload.name || !payload.category || !payload.location) {
        throw new Error("Name, category, and location are required.");
      }

      database.charities.unshift({
        active: true,
        category: payload.category,
        description: payload.description || payload.shortDescription || "",
        events: [],
        featured: false,
        id: crypto.randomUUID(),
        impactMetric: payload.impactMetric || "Impact details coming soon",
        location: payload.location,
        name: payload.name,
        shortDescription: payload.shortDescription || payload.description || "",
        slug: createSlug(payload.name),
        spotlight: false,
        tags: payload.tags ?? [],
        visual: {
          accent: "#f6d88d",
          glow: "rgba(246, 216, 141, 0.25)",
          mesh: payload.mesh || "linear-gradient(135deg, rgba(246,216,141,0.88), rgba(16,70,58,0.9))"
        }
      });

      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add the charity." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      active?: boolean;
      category?: string;
      charityId?: string;
      description?: string;
      featured?: boolean;
      impactMetric?: string;
      location?: string;
      name?: string;
      shortDescription?: string;
      spotlight?: boolean;
      tags?: string[];
    };

    const adminPayload = await updateDatabase((database) => {
      const charity = database.charities.find((candidate) => candidate.id === payload.charityId);
      if (!charity) {
        throw new Error("Charity not found.");
      }

      charity.active = payload.active ?? charity.active;
      charity.category = payload.category ?? charity.category;
      charity.description = payload.description ?? charity.description;
      charity.featured = payload.featured ?? charity.featured;
      charity.impactMetric = payload.impactMetric ?? charity.impactMetric;
      charity.location = payload.location ?? charity.location;
      charity.name = payload.name ?? charity.name;
      charity.shortDescription = payload.shortDescription ?? charity.shortDescription;
      charity.slug = createSlug(charity.name);
      charity.spotlight = payload.spotlight ?? charity.spotlight;
      charity.tags = payload.tags ?? charity.tags;

      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the charity." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      charityId?: string;
    };

    const adminPayload = await updateDatabase((database) => {
      const charityIndex = database.charities.findIndex((candidate) => candidate.id === payload.charityId);
      if (charityIndex === -1) {
        throw new Error("Charity not found.");
      }

      const fallbackCharity = database.charities.find(
        (candidate) => candidate.id !== payload.charityId && candidate.active
      );

      if (!fallbackCharity) {
        throw new Error("At least one active charity must remain.");
      }

      database.users.forEach((user) => {
        if (user.charitySelection.charityId === payload.charityId) {
          user.charitySelection.charityId = fallbackCharity.id;
        }
      });

      database.charities.splice(charityIndex, 1);

      return buildAdminPayload(database, currentUser.id);
    });

    return NextResponse.json(adminPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete the charity." },
      { status: 400 }
    );
  }
}
