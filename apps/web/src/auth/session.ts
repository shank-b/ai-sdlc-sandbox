// Web Crypto only: this file also runs in middleware (edge runtime). See ADR 0002.
// Cookie value: <userId>.<expiry seconds>.<base64url HMAC-SHA-256 of "<userId>.<expiry>">

export const SESSION_COOKIE = "session";
// TODO(#2): 7-day lifetime is an assumption, confirm with the owner
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

const enc = new TextEncoder();

const toB64Url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64Url = (s: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const key = (secret: string, usage: "sign" | "verify") =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

export function sessionSecret(env: Record<string, string | undefined> = process.env): string {
  const s = env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return s;
}

export async function signSession(userId: string, secret: string, nowMs = Date.now()): Promise<string> {
  const payload = `${userId}.${Math.floor(nowMs / 1000) + SESSION_MAX_AGE_S}`;
  const sig = await crypto.subtle.sign("HMAC", await key(secret, "sign"), enc.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

/** The user id if the value is correctly signed and unexpired, otherwise null. */
export async function verifySession(value: string | null | undefined, secret: string, nowMs = Date.now()): Promise<string | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, sig] = parts as [string, string, string];
  if (!/^\d+$/.test(expiry) || userId === "") return null;
  const sigBytes = fromB64Url(sig);
  if (!sigBytes) return null;
  // subtle.verify compares in constant time
  const ok = await crypto.subtle.verify("HMAC", await key(secret, "verify"), sigBytes, enc.encode(`${userId}.${expiry}`));
  if (!ok || Number(expiry) * 1000 <= nowMs) return null;
  return userId;
}

export async function userIdFromCookieHeader(header: string | null | undefined, secret: string, nowMs = Date.now()): Promise<string | null> {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) return verifySession(part.slice(i + 1).trim(), secret, nowMs);
  }
  return null;
}

const attrs = (secure: boolean) => `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;

export const sessionCookie = (value: string, secure: boolean) => `${SESSION_COOKIE}=${value}; ${attrs(secure)}; Max-Age=${SESSION_MAX_AGE_S}`;
export const clearedSessionCookie = (secure: boolean) => `${SESSION_COOKIE}=; ${attrs(secure)}; Max-Age=0`;
