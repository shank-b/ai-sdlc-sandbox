import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_S,
  clearedSessionCookie,
  sessionCookie,
  sessionSecret,
  signSession,
  userIdFromCookieHeader,
  verifySession,
} from "./session";

const secret = "test-secret-that-is-long-enough-0123456789";
const uid = "3f2b8f0e-1c3d-4a5b-9c7d-0123456789ab";
const other = "aaaaaaaa-1c3d-4a5b-9c7d-0123456789ab";
const now = 1_800_000_000_000;

describe("sign and verify", () => {
  it("round-trips the user id", async () => {
    expect(await verifySession(await signSession(uid, secret, now), secret, now)).toBe(uid);
  });

  it("has the form <userId>.<expiry>.<signature>, expiring in 7 days", async () => {
    const [id, exp, sig] = (await signSession(uid, secret, now)).split(".");
    expect(id).toBe(uid);
    expect(Number(exp)).toBe(Math.floor(now / 1000) + SESSION_MAX_AGE_S);
    expect(SESSION_MAX_AGE_S).toBe(7 * 24 * 60 * 60);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects a changed user id", async () => {
    const [, exp, sig] = (await signSession(uid, secret, now)).split(".");
    expect(await verifySession(`${other}.${exp}.${sig}`, secret, now)).toBeNull();
  });

  it("rejects a changed expiry", async () => {
    const [id, exp, sig] = (await signSession(uid, secret, now)).split(".");
    expect(await verifySession(`${id}.${Number(exp) + 1000}.${sig}`, secret, now)).toBeNull();
  });

  it("rejects a changed or truncated signature", async () => {
    const v = await signSession(uid, secret, now);
    const flipped = v.slice(0, -1) + (v.endsWith("A") ? "B" : "A");
    expect(await verifySession(flipped, secret, now)).toBeNull();
    expect(await verifySession(v.slice(0, -4), secret, now)).toBeNull();
  });

  it("rejects a value signed with another secret", async () => {
    expect(await verifySession(await signSession(uid, "another-secret-another-secret-another", now), secret, now)).toBeNull();
  });

  it("rejects an expired session and accepts one second before expiry", async () => {
    const v = await signSession(uid, secret, now);
    const expiresAt = now + SESSION_MAX_AGE_S * 1000;
    expect(await verifySession(v, secret, expiresAt - 1000)).toBe(uid);
    expect(await verifySession(v, secret, expiresAt)).toBeNull();
    expect(await verifySession(v, secret, expiresAt + 1)).toBeNull();
  });

  it.each(["a", "abcde", "a=b", "é"])("returns null, not a throw, for the odd-length or invalid signature %j", async (sig) => {
    await expect(verifySession(`${uid}.1900000000.${sig}`, secret, now)).resolves.toBeNull();
  });

  it.each([undefined, null, "", "x", "a.b", "a.b.c.d", "..", `${uid}.notanumber.sig`])("rejects malformed value %j", async (v) => {
    expect(await verifySession(v, secret, now)).toBeNull();
  });
});

describe("cookie header", () => {
  it("reads the session cookie among others", async () => {
    const v = await signSession(uid, secret, now);
    expect(await userIdFromCookieHeader(`a=1; session=${v}; b=2`, secret, now)).toBe(uid);
    expect(await userIdFromCookieHeader("a=1", secret, now)).toBeNull();
    expect(await userIdFromCookieHeader(null, secret, now)).toBeNull();
  });

  it("tries later session cookies when an earlier one is invalid", async () => {
    const v = await signSession(uid, secret, now);
    expect(await userIdFromCookieHeader(`session=forged; session=${v}`, secret, now)).toBe(uid);
    expect(await userIdFromCookieHeader(`session=a; session=b`, secret, now)).toBeNull();
  });

  it("sets HttpOnly, SameSite=Lax, a 7-day Max-Age, Path=/, and Secure only when asked", () => {
    const c = sessionCookie("v", false);
    expect(c).toContain("session=v");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).toContain(`Max-Age=${SESSION_MAX_AGE_S}`);
    expect(c).not.toContain("Secure");
    expect(sessionCookie("v", true)).toContain("Secure");
  });

  it("clears the cookie", () => {
    const c = clearedSessionCookie(false);
    expect(c).toContain("session=;");
    expect(c).toContain("Max-Age=0");
    expect(c).toContain("HttpOnly");
  });
});

describe("sessionSecret", () => {
  it("returns the configured secret", () => {
    expect(sessionSecret({ SESSION_SECRET: secret })).toBe(secret);
  });

  it("fails loudly when missing or too short, without echoing the value", () => {
    expect(() => sessionSecret({})).toThrow(/SESSION_SECRET/);
    expect(() => sessionSecret({ SESSION_SECRET: "short" })).toThrow(/at least 32/);
    try {
      sessionSecret({ SESSION_SECRET: "short" });
    } catch (e) {
      expect(String(e)).not.toContain("short\"");
    }
  });
});
