import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __db?: unknown }).__db;
});

describe("getDb", () => {
  it("does not cache a failed start-up", async () => {
    vi.stubEnv("DB_DRIVER", "");
    vi.stubEnv("DATABASE_URL", "");
    await expect(getDb()).rejects.toThrow(/DATABASE_URL/);

    vi.stubEnv("DB_DRIVER", "pglite");
    await expect(getDb()).resolves.toBeDefined();
  }, 30_000);

  it("returns the same handle on later calls", async () => {
    vi.stubEnv("DB_DRIVER", "pglite");
    expect(await getDb()).toBe(await getDb());
  }, 30_000);
});
