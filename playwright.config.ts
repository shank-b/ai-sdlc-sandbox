import { defineConfig, devices } from "@playwright/test";

const port = 3100;
// second server for the "no accounts set up" screen; own build dir so the two never share .next
const emptyPort = 3101;
const emptyDist = ".next-empty";

// In-memory database seeded from accounts.example.json (Asha and Ben); the secret is for tests only.
const env = {
  DB_DRIVER: "pglite",
  SESSION_SECRET: "e2e-only-secret-not-for-production-0123456789",
};

const serve = (p: number, extra: Record<string, string> = {}) => {
  const vars = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(" ");
  const run = (cmd: string) => `${vars} ${cmd}`.trim();
  // CI exercises the production build so the production CSP reaches a browser.
  return process.env.CI
    ? `${run("npm run build")} && ${run(`npm run start -- --hostname 127.0.0.1 --port ${p}`)}`
    : run(`npm run dev -- --hostname 127.0.0.1 --port ${p}`);
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: "**/empty.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${port}` } },
    { name: "no-accounts", testMatch: "**/empty.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${emptyPort}` } },
  ],
  webServer: [
    { command: serve(port), env, url: `http://localhost:${port}/auth/signin`, reuseExistingServer: !process.env.CI, timeout: 180_000 },
    {
      command: serve(emptyPort, { NEXT_DIST_DIR: emptyDist }),
      env: { ...env, SEED_ACCOUNTS_FILE: "/nonexistent/accounts.json" },
      url: `http://localhost:${emptyPort}/auth/signin`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
