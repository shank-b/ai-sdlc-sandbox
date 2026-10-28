import { afterAll, describe, expect, it } from "vitest";
import { createPgDb } from "./client";
import { users } from "./schema";
import { addTodo, deleteTodo, listTodos, setCompleted } from "../apps/web/src/data/index";

// Runs only against a real Postgres: `DATABASE_URL=postgres://... npm test`.
// The migration must already be applied (`npm run db:migrate`).
describe.skipIf(!process.env.DATABASE_URL)("data layer on real Postgres", () => {
  const { db, close } = createPgDb(process.env.DATABASE_URL ?? "");
  afterAll(() => close());

  it("adds, completes, lists and deletes through the pg driver", async () => {
    const [u] = await db.insert(users).values({ name: `smoke-${crypto.randomUUID()}` }).returning();
    try {
      const t = await addTodo(db, u!.id, "smoke");
      expect((await setCompleted(db, u!.id, t.id, true))!.completedAt).toBeInstanceOf(Date);
      expect(await listTodos(db, u!.id)).toHaveLength(1);
      expect(await deleteTodo(db, u!.id, t.id)).toBe(true);
    } finally {
      await db.delete(users).where((await import("drizzle-orm")).eq(users.id, u!.id));
    }
  });
});
