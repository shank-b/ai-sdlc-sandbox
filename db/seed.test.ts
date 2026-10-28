import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "./client";
import { readAccounts, seedUsers } from "./seed";
import { users } from "./schema";

const root = path.resolve(import.meta.dirname, "..");
let db: Db;

beforeEach(async () => {
  db = (await createPgliteDb()).db;
});

const names = async () => (await db.select().from(users)).map((u) => u.name).sort();

describe("seeding from the example file (AC6.6, example half)", () => {
  it("produces exactly Asha and Ben", async () => {
    await seedUsers(db, await readAccounts(path.join(root, "accounts.example.json")));
    expect(await names()).toEqual(["Asha", "Ben"]);
  });

  it("is idempotent", async () => {
    const accounts = await readAccounts(path.join(root, "accounts.example.json"));
    await seedUsers(db, accounts);
    await seedUsers(db, accounts);
    expect(await names()).toEqual(["Asha", "Ben"]);
  });

  it("a missing file produces no users", async () => {
    const accounts = await readAccounts(path.join(root, "does-not-exist.json"));
    expect(accounts).toEqual([]);
    await seedUsers(db, accounts);
    expect(await names()).toEqual([]);
  });

  it("trims names and ignores blanks and duplicates", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "seed-"));
    const file = path.join(dir, "a.json");
    await writeFile(file, JSON.stringify({ accounts: [" Asha ", "", "  ", "Asha", "Ben"] }));
    expect(await readAccounts(file)).toEqual(["Asha", "Ben"]);
  });

  it("rejects a malformed file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "seed-"));
    const file = path.join(dir, "a.json");
    await writeFile(file, JSON.stringify({ accounts: [1] }));
    await expect(readAccounts(file)).rejects.toThrow(/accounts/);
  });
});

describe("the seed command", () => {
  const run = (env: Record<string, string>) =>
    spawnSync("npm", ["run", "--silent", "seed", "--", path.join(root, "accounts.example.json")], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "", DB_DRIVER: "", ...env },
    });

  it("runs under Node's type stripping and reports what it seeded", () => {
    const r = run({ DB_DRIVER: "pglite" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Seeded 2 account(s)");
  }, 30_000);

  it("exits non-zero with a clear message when no database is configured", () => {
    const r = run({});
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("DATABASE_URL is not set");
  });
});
