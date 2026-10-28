import fc from "fast-check";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@db/client";
import { todos, users } from "@db/schema";
import { addTodo, deleteTodo, getUser, listTodos, listUsers, setCompleted } from "./index";

let db: Db;
beforeAll(async () => {
  db = (await createPgliteDb()).db;
});
beforeEach(async () => {
  await db.delete(users); // cascades to todos
});

const mkUser = async (name: string) => (await db.insert(users).values({ name }).returning())[0]!;

describe("users", () => {
  it("lists users by name and finds one by id", async () => {
    const b = await mkUser("Ben");
    await mkUser("Asha");
    expect((await listUsers(db)).map((u) => u.name)).toEqual(["Asha", "Ben"]);
    expect(await getUser(db, b.id)).toEqual(b);
    expect(await getUser(db, crypto.randomUUID())).toBeNull();
    expect(await getUser(db, "not-a-uuid")).toBeNull();
  });
});

describe("scoped item functions", () => {
  it("adds and lists the caller's items", async () => {
    const a = await mkUser("Asha");
    const t = await addTodo(db, a.id, "Buy milk");
    expect(t).toMatchObject({ userId: a.id, title: "Buy milk", completedAt: null });
    expect(await listTodos(db, a.id)).toEqual([t]);
  });

  it("completes and un-completes", async () => {
    const a = await mkUser("Asha");
    const t = await addTodo(db, a.id, "x");
    const done = await setCompleted(db, a.id, t.id, true);
    expect(done!.completedAt).toBeInstanceOf(Date);
    const open = await setCompleted(db, a.id, t.id, false);
    expect(open!.completedAt).toBeNull();
  });

  it("deletes", async () => {
    const a = await mkUser("Asha");
    const t = await addTodo(db, a.id, "x");
    expect(await deleteTodo(db, a.id, t.id)).toBe(true);
    expect(await listTodos(db, a.id)).toEqual([]);
    expect(await deleteTodo(db, a.id, t.id)).toBe(false);
  });

  it("treats a malformed id as not found", async () => {
    const a = await mkUser("Asha");
    expect(await setCompleted(db, a.id, "nope", true)).toBeNull();
    expect(await deleteTodo(db, a.id, "nope")).toBe(false);
  });

  it("A cannot complete, un-complete or delete B's item (AC5.3)", async () => {
    const a = await mkUser("Asha");
    const b = await mkUser("Ben");
    const bt = await addTodo(db, b.id, "Ben's");
    const bDone = (await setCompleted(db, b.id, bt.id, true))!;

    expect(await setCompleted(db, a.id, bt.id, false)).toBeNull();
    expect(await deleteTodo(db, a.id, bt.id)).toBe(false);
    expect(await listTodos(db, b.id)).toEqual([bDone]);

    const bOpen = await addTodo(db, b.id, "open");
    expect(await setCompleted(db, a.id, bOpen.id, true)).toBeNull();
    expect((await listTodos(db, b.id)).find((t) => t.id === bOpen.id)!.completedAt).toBeNull();
  });

  it("every function refuses an empty user id", async () => {
    const a = await mkUser("Asha");
    const t = await addTodo(db, a.id, "x");
    expect(await listTodos(db, "")).toEqual([]);
    expect(await setCompleted(db, "", t.id, true)).toBeNull();
    expect(await deleteTodo(db, "", t.id)).toBe(false);
    await expect(addTodo(db, "", "x")).rejects.toThrow();
  });
});

describe("per-user isolation property (AC5.2)", () => {
  it("each user sees exactly their own items", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== ""), { maxLength: 5 }), { minLength: 2, maxLength: 4 }),
        async (perUser) => {
          await db.delete(users);
          const ids: string[] = [];
          for (let i = 0; i < perUser.length; i++) {
            const u = await mkUser(`u${i}`);
            ids.push(u.id);
            for (const title of perUser[i]!) await addTodo(db, u.id, title);
          }
          for (let i = 0; i < ids.length; i++) {
            const seen = await listTodos(db, ids[i]!);
            expect(seen.every((t) => t.userId === ids[i])).toBe(true);
            expect(seen.map((t) => t.title).sort()).toEqual([...perUser[i]!].sort());
          }
          const total = (await db.select().from(todos)).length;
          expect(total).toBe(perUser.reduce((n, l) => n + l.length, 0));
        },
      ),
      { numRuns: 25 },
    );
  });
});
