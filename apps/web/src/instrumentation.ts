// Runs once when the server starts. With DB_DRIVER=pglite (end-to-end runs) the in-memory
// database is created, migrated and seeded from the committed example accounts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DB_DRIVER !== "pglite") return;
  const [{ getDb }, { readAccounts, seedUsers }, path] = await Promise.all([
    import("@db/client"),
    import("@db/seed"),
    import("node:path"),
  ]);
  await seedUsers(await getDb(), await readAccounts(path.join(process.cwd(), "accounts.example.json")));
}
