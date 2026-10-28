import path from "node:path";
import { getDb } from "@db/client";
import { readAccounts, seedUsers } from "@db/seed";

export async function seedInMemoryDatabase() {
  await seedUsers(await getDb(), await readAccounts(process.env.SEED_ACCOUNTS_FILE ?? path.join(process.cwd(), "accounts.example.json")));
}
