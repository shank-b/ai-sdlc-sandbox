import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@db/client";
import { todos, users } from "@db/schema";

// The only code that queries todos. Every item function takes userId and puts it in the WHERE
// clause, so another user's id matches no row (ADR 0003).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID.test(s);

export type User = typeof users.$inferSelect;
export type Todo = typeof todos.$inferSelect;

export async function listUsers(db: Db): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name));
}

export async function getUser(db: Db, id: string): Promise<User | null> {
  if (!isUuid(id)) return null;
  return (await db.select().from(users).where(eq(users.id, id)))[0] ?? null;
}

export async function listTodos(db: Db, userId: string): Promise<Todo[]> {
  if (!isUuid(userId)) return [];
  return db.select().from(todos).where(eq(todos.userId, userId));
}

export async function addTodo(db: Db, userId: string, title: string): Promise<Todo> {
  if (!isUuid(userId)) throw new Error("addTodo: invalid user id");
  return (await db.insert(todos).values({ userId, title }).returning())[0]!;
}

/** Returns null when the item doesn't exist or isn't the caller's. */
export async function setCompleted(db: Db, userId: string, id: string, completed: boolean): Promise<Todo | null> {
  if (!isUuid(userId) || !isUuid(id)) return null;
  const rows = await db
    .update(todos)
    .set({ completedAt: completed ? new Date() : null })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

/** False when the item doesn't exist or isn't the caller's. */
export async function deleteTodo(db: Db, userId: string, id: string): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(id)) return false;
  const rows = await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).returning({ id: todos.id });
  return rows.length > 0;
}
