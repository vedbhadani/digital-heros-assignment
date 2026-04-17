import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/lib/types";

// Using a singleton ID for our global state record
const GLOBAL_STATE_ID = "global_state";

function normalizeSubscriptionStates(database: Database) {
  const today = new Date().toISOString().slice(0, 10);

  database.users.forEach((user) => {
    if (user.role !== "subscriber") {
      return;
    }

    if (user.subscription.status === "cancelled") {
      user.subscription.accessRestricted = true;
      return;
    }

    if (user.subscription.renewalDate < today && user.subscription.status === "active") {
      user.subscription.status = "lapsed";
    }

    user.subscription.accessRestricted = user.subscription.status !== "active";
  });
}

export async function readDatabase(): Promise<Database> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from("app_state")
    .select("payload")
    .eq("id", GLOBAL_STATE_ID)
    .single();

  if (error) {
    console.error("Supabase Read Error:", error);
    throw new Error(`Failed to read database from Supabase: ${error.message}`);
  }

  const database = data.payload as Database;
  normalizeSubscriptionStates(database);
  return database;
}

export async function writeDatabase(database: Database): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("app_state")
    .upsert({
      id: GLOBAL_STATE_ID,
      payload: database,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Supabase Write Error:", error);
    throw new Error(`Failed to write database to Supabase: ${error.message}`);
  }
}

// Our existing serialized mutation logic remains exactly the same,
// but now operates on the cloud-hosted state.
let writeQueue = Promise.resolve();

export async function updateDatabase<T>(
  mutator: (database: Database) => T | Promise<T>
): Promise<T> {
  let output!: T;

  writeQueue = writeQueue.then(async () => {
    const database = await readDatabase();
    output = await mutator(database);
    database.meta.updatedAt = new Date().toISOString();
    await writeDatabase(database);
  });

  await writeQueue;

  return output;
}
