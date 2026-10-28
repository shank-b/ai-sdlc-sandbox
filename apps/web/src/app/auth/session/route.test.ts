import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@db/client";
import { users } from "@db/schema";
import { userIdFromCookieHeader } from "../../../auth/session";
import { DELETE, POST } from "./route";

const secret = "route-test-secret-that-is-long-enough-0123";
const origin = "http://localhost:3000";
let asha: string;

beforeAll(async () => {
  vi.stubEnv("DB_DRIVER", "pglite");
  vi.stubEnv("SESSION_SECRET", secret);
});
beforeEach(async () => {
  const db = await getDb();
  await db.delete(users);
  asha = (await db.insert(users).values({ name: "Asha" }).returning())[0]!.id;
});
afterEach(() => vi.restoreAllMocks());

const post = (body: unknown, headers: Record<string, string> = { origin }) =>
  POST(
    new Request(`${origin}/auth/session`, {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /auth/session", () => {
  it("signs in an existing user with a signed HttpOnly cookie (AC6.2)", async () => {
    const res = await post({ userId: asha });
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(await userIdFromCookieHeader(cookie.split(";")[0], secret)).toBe(asha);
  });

  it("refuses an unknown user with 401 and sets no cookie (AC6.4)", async () => {
    const res = await post({ userId: crypto.randomUUID() });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it.each([{}, { userId: 5 }, { userId: "not-a-uuid" }, "not json"])("refuses a bad body %j with 401", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a foreign or missing Origin with 403", async () => {
    expect((await post({ userId: asha }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ userId: asha }, {})).status).toBe(403);
  });

  it("answers 500 and logs no cookie or secret when signing fails (AC5.5)", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ userId: asha });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(asha);
    const out = spy.mock.calls.flat().map(String).join(" ");
    expect(out).toContain("POST /auth/session");
    expect(out).not.toContain(asha);
    vi.stubEnv("SESSION_SECRET", secret);
  });
});

describe("DELETE /auth/session", () => {
  it("clears the cookie (AC6.3)", async () => {
    const res = await DELETE(new Request(`${origin}/auth/session`, { method: "DELETE", headers: { origin, host: "localhost:3000" } }));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("refuses a foreign Origin", async () => {
    const res = await DELETE(new Request(`${origin}/auth/session`, { method: "DELETE", headers: { origin: "https://evil.example", host: "localhost:3000" } }));
    expect(res.status).toBe(403);
  });
});
