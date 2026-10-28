import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createDb, type Db } from "./client.ts";
import { users } from "./schema.ts";

/** Display names from an accounts file: `{ "accounts": ["Asha", "Ben"] }`. A missing file means no accounts. */
export async function readAccounts(file: string): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const parsed: unknown = JSON.parse(text);
  const list = (parsed as { accounts?: unknown } | null)?.accounts;
  if (!Array.isArray(list) || !list.every((n) => typeof n === "string")) {
    throw new Error(`${file}: expected { "accounts": ["name", ...] }`);
  }
  return [...new Set(list.map((n: string) => n.trim()).filter((n) => n !== ""))];
}

// TODO(#2): never deletes users removed from accounts.local.json
export async function seedUsers(db: Db, names: string[]): Promise<void> {
  if (names.length === 0) return;
  await db.insert(users).values(names.map((name) => ({ name }))).onConflictDoNothing({ target: users.name });
}

async function main() {
  const file = process.argv[2] ?? "accounts.local.json";
  const names = await readAccounts(file);
  const { db, close } = await createDb();
  try {
    await seedUsers(db, names);
    console.log(`Seeded ${names.length} account(s) from ${file}`);
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
