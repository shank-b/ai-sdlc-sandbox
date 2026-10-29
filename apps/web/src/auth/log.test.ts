import { afterEach, describe, expect, it, vi } from "vitest";
import { logRouteError } from "./log";

afterEach(() => vi.restoreAllMocks());

// AC5.5: logs carry no session identifiers, tokens or secrets.
describe("logRouteError", () => {
  it("logs the route and error class only", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cookie = "session=3f2b8f0e-1c3d-4a5b-9c7d-0123456789ab.1800000000.SIGNATUREVALUE";
    const err = new TypeError(`failed for ${cookie} with SESSION_SECRET=hunter2-hunter2-hunter2-hunter2`);
    logRouteError("POST /auth/session", err);
    const out = spy.mock.calls.flat().map(String).join(" ");
    expect(out).toContain("POST /auth/session");
    expect(out).toContain("TypeError");
    expect(out).not.toContain("SIGNATUREVALUE");
    expect(out).not.toContain("3f2b8f0e");
    expect(out).not.toContain("hunter2");
  });

  it("handles non-error throwables", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logRouteError("DELETE /auth/session", "secret string");
    expect(spy.mock.calls.flat().map(String).join(" ")).not.toContain("secret string");
  });
});
