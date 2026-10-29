import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { signSession } from "./auth/session";
import { config, middleware } from "./middleware";

const secret = "middleware-test-secret-long-enough-01234567";
const uid = "3f2b8f0e-1c3d-4a5b-9c7d-0123456789ab";
let cookie: string;

beforeAll(async () => {
  process.env.SESSION_SECRET = secret;
  cookie = `session=${await signSession(uid, secret)}`;
});

const call = (path: string, headers: Record<string, string> = {}) => middleware(new NextRequest(`http://localhost:3000${path}`, { headers }));

describe("middleware (AC5.4)", () => {
  it("redirects a page request with no session to sign-in", async () => {
    const res = await call("/");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/auth/signin");
  });

  it("redirects a page request with a tampered session", async () => {
    const res = await call("/", { cookie: `${cookie}x` });
    expect(res.status).toBe(307);
  });

  it("answers 401 JSON with no item data for an API request with no session", async () => {
    const res = await call("/api/todos");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("lets a request with a valid session through", async () => {
    const res = await call("/", { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect((await call("/api/todos", { cookie })).status).toBe(200);
  });

  it("matcher skips the sign-in page, the session route, the icons and static assets, and covers everything else", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const open of ["/auth/signin", "/auth/session", "/_next/static/x.js", "/favicon.ico", "/icon.svg"]) expect(re.test(open), open).toBe(false);
    for (const open of ["/auth/signin/", "/auth/session/x"]) expect(re.test(open), open).toBe(false);
    for (const guarded of ["/", "/api/todos", "/api/todos/1", "/auth/other", "/auth/signin-anything", "/auth/sessionfoo", "/icon.svg.map", "/favicon.icon"]) expect(re.test(guarded), guarded).toBe(true);
  });
});
