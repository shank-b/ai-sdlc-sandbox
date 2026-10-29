// Runs once when the server starts. With DB_DRIVER=pglite (end-to-end runs) the in-memory
// database is created, migrated and seeded from the committed example accounts
// (SEED_ACCOUNTS_FILE overrides the file; a missing file seeds nobody).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DB_DRIVER !== "pglite") return;
  const { seedInMemoryDatabase } = await import("./instrumentation-node");
  await seedInMemoryDatabase();
}
