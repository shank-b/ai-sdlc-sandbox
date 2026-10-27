import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
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

  describe("content security policy", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    const cspFor = async (env: string) => {
      vi.stubEnv("NODE_ENV", env);
      vi.resetModules();
      const { default: cfg } = await import("../next.config.mjs");
      const rules = await cfg.headers!();
      return rules[0].headers.find((x) => x.key === "Content-Security-Policy")!.value;
    };

    it("has no unsafe-eval in production, test or staging builds", async () => {
      for (const env of ["production", "test", "staging"]) {
        expect(await cspFor(env)).not.toContain("'unsafe-eval'");
      }
    });

    it("allows unsafe-eval only in development", async () => {
      expect(await cspFor("development")).toContain("'unsafe-eval'");
    });

    it("locks down objects, base URI, forms and connections", async () => {
      const csp = await cspFor("production");
      for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'"]) {
        expect(csp).toContain(d);
      }
    });
  });

  it("hides the framework and pins the tracing root", () => {
    expect(config.poweredByHeader).toBe(false);
    
    expect(path.isAbsolute(config.outputFileTracingRoot!)).toBe(true);
  });
});
