import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@core": path.resolve(import.meta.dirname, "packages/core/src") } },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "db/**/*.test.ts"],
  },
});
