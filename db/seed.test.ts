import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
  it("is exposed as npm run seed and loads under Node's type stripping", () => {
    const pkg = JSON.parse(execFileSync("node", ["-p", "JSON.stringify(require('./package.json').scripts)"], { cwd: root }).toString());
    expect(pkg.seed).toContain("db/seed.ts");
  });
});
