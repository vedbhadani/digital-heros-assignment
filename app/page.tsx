import { HomePage } from "@/components/home-page";
import { readDatabase } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const database = await readDatabase();
  const currentUser = await getCurrentUser();
  const latestPublishedDraw =
    [...database.draws]
      .filter((draw) => draw.status === "published")
      .sort((left, right) => right.month.localeCompare(left.month))[0] ?? null;

  return (
    <HomePage
      charities={database.charities.filter((charity) => charity.active)}
      currentUser={currentUser}
      latestPublishedDraw={latestPublishedDraw}
      settings={database.settings}
    />
  );
}

