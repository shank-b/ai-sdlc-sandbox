import { defineConfig } from "drizzle-kit";

// `generate` only reads the schema; commands that connect need a real URL.
const url = process.env.DATABASE_URL;
if (!url && process.argv.includes("migrate")) {
  throw new Error("DATABASE_URL is not set; it is required to run db:migrate");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: url ?? "" },
});
