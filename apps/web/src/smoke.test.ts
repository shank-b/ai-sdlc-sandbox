import { describe, expect, it } from "vitest";
import config from "../next.config.mjs";

describe("next config", () => {
  it("builds a standalone output for container hosts", () => {
    expect(config.output).toBe("standalone");
  });

  it("sends the security headers on every route", async () => {
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === "/(.*)");
    expect(all).toBeDefined();
    const h = Object.fromEntries(all!.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("same-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"]).toContain("camera=()");
  });
});
