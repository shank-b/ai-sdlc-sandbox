import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema.ts";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Handle = { db: Db; close: () => Promise<void> };

const migrationsFolder = () => path.join(process.cwd(), "db", "migrations");

/** In-memory Postgres (PGlite) with the migration applied. Used by tests and the end-to-end server. */
export async function createPgliteDb(): Promise<Handle> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return { db, close: () => client.close() };
}

export function createPgDb(url: string): Handle {
  // TODO(#2): this branch is not exercised in CI (tests use PGlite); run the DATABASE_URL smoke test before deploying
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzlePg(pool, { schema }), close: () => pool.end() };
}

/** DB_DRIVER=pglite selects the in-memory database; anything else needs DATABASE_URL. */
export async function createDb(env: NodeJS.ProcessEnv = process.env): Promise<Handle> {
  if (env.DB_DRIVER === "pglite") return createPgliteDb();
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set (or set DB_DRIVER=pglite)");
  return createPgDb(env.DATABASE_URL);
}

const shared = globalThis as { __db?: Promise<Handle> };

/** One handle per server process, kept across dev hot reloads. */
export function getDb(): Promise<Db> {
  shared.__db ??= createDb();
  return shared.__db.then((h) => h.db);
}
