import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { todos, users } from "../schema";

let db: ReturnType<typeof drizzle>;

beforeEach(async () => {
  db = drizzle(new PGlite());
  await migrate(db, { migrationsFolder: import.meta.dirname });
});

const addUser = async (name = "Asha") =>
  (await db.insert(users).values({ name }).returning())[0]!;

describe("migration on an empty in-memory database", () => {
  it("creates empty users and todos tables", async () => {
    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(todos)).toEqual([]);
  });

  it("defaults id, created_at and a null completed_at", async () => {
    const u = await addUser(crypto.randomUUID());
    const [t] = await db.insert(todos).values({ userId: u.id, title: "Buy milk" }).returning();
    expect(t!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t!.completedAt).toBeNull();
    expect(t!.createdAt).toBeInstanceOf(Date);
  });
});

describe("title check (1 to 140 characters)", () => {
  const insert = async (title: string) => {
    const u = await addUser(crypto.randomUUID());
    return db.insert(todos).values({ userId: u.id, title });
  };

  it("accepts 1 and 140 characters", async () => {
    await expect(insert("a")).resolves.toBeDefined();
    await expect(insert("a".repeat(140))).resolves.toBeDefined();
  });

  it("rejects the empty title and 141 characters", async () => {
    await expect(insert("")).rejects.toThrow();
    await expect(insert("a".repeat(141))).rejects.toThrow();
  });
});

describe("users", () => {
  it("rejects a duplicate name", async () => {
    await addUser("Asha");
    await expect(addUser("Asha")).rejects.toThrow();
  });
});

describe("cascade delete", () => {
  it("deleting a user deletes only that user's todos", async () => {
    const a = await addUser("Asha");
    const b = await addUser("Ben");
    await db.insert(todos).values([
      { userId: a.id, title: "A1" },
      { userId: a.id, title: "A2" },
      { userId: b.id, title: "B1" },
    ]);
    await db.delete(users).where(eq(users.id, a.id));
    const left = await db.select().from(todos);
    expect(left.map((t) => t.title)).toEqual(["B1"]);
  });

  it("rejects a todo for a user that does not exist", async () => {
    await expect(
      db.insert(todos).values({ userId: "00000000-0000-0000-0000-000000000000", title: "x" }),
    ).rejects.toThrow();
  });
});
