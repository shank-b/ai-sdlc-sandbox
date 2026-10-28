import { describe, expect, it } from "vitest";
import { sameOrigin } from "./origin";

const req = (headers: Record<string, string>) => new Request("http://localhost:3000/x", { method: "POST", headers });

describe("sameOrigin", () => {
  it("accepts an Origin whose host matches the Host header", () => {
    expect(sameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("rejects a different host, a different port, a missing Origin and garbage", () => {
    expect(sameOrigin(req({ origin: "https://evil.example", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ origin: "http://localhost:3001", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ origin: "null", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ origin: "http://localhost:3000" }))).toBe(false);
  });
});
