import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@db/client";
import { todos, users } from "@db/schema";
import { signSession } from "../../../auth/session";
import * as data from "../../../data";
import { POST } from "./route";
import { DELETE, PATCH } from "./[id]/route";

// Keep the real data layer but let one test make it fail.
vi.mock("../../../data", async (orig) => {
  const real = await orig<typeof import("../../../data")>();
  return { ...real, addTodo: vi.fn(real.addTodo) };
});

const secret = "api-test-secret-that-is-long-enough-0123456";
const origin = "http://localhost:3000";
let asha: { id: string };
let ben: { id: string };
let ashaCookie: string;
let benCookie: string;

beforeAll(() => {
  vi.stubEnv("DB_DRIVER", "pglite");
  vi.stubEnv("SESSION_SECRET", secret);
});

beforeEach(async () => {
  const db = await getDb();
  await db.delete(users);
  asha = (await db.insert(users).values({ name: "Asha" }).returning())[0]!;
  ben = (await db.insert(users).values({ name: "Ben" }).returning())[0]!;
  ashaCookie = `session=${await signSession(asha.id, secret)}`;
  benCookie = `session=${await signSession(ben.id, secret)}`;
});
afterEach(() => vi.restoreAllMocks());

type Opts = { cookie?: string | null; origin?: string | null; body?: unknown };
const headers = (o: Opts) => {
  const h: Record<string, string> = { host: "localhost:3000", "content-type": "application/json" };
  if (o.cookie !== null) h.cookie = o.cookie ?? ashaCookie;
  if (o.origin !== null) h.origin = o.origin ?? origin;
  return h;
};
const call = (method: string, o: Opts = {}) =>
  new Request(`${origin}/api/todos`, { method, headers: headers(o), body: o.body === undefined ? undefined : JSON.stringify(o.body) });
const post = (o: Opts = {}) => POST(call("POST", o));
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (id: string, o: Opts = {}) => PATCH(call("PATCH", o), ctx(id));
const del = (id: string, o: Opts = {}) => DELETE(call("DELETE", o), ctx(id));
const rows = async () => (await getDb()).select().from(todos);
const add = async (userId: string, title = "Buy milk") => data.addTodo(await getDb(), userId, title);

describe("POST /api/todos", () => {
  it("creates an item for the caller and returns it without the user id (AC1.1)", async () => {
    const res = await post({ body: { title: "  Buy milk  " } });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ title: "Buy milk", completedAt: null });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(body).sort()).toEqual(["completedAt", "createdAt", "id", "title"]);
    expect((await rows()).map((r) => [r.userId, r.title])).toEqual([[asha.id, "Buy milk"]]);
  });

  it("accepts exactly 140 characters and refuses 141 with title_too_long (AC1.4)", async () => {
    expect((await post({ body: { title: "x".repeat(140) } })).status).toBe(201);
    const res = await post({ body: { title: "x".repeat(141) } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "title_too_long" });
    expect(await rows()).toHaveLength(1);
  });

  it.each([{ title: "" }, { title: "   " }, {}, { title: 5 }, null])("refuses %j with title_required (AC1.2)", async (body) => {
    const res = await post({ body });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "title_required" });
    expect(await rows()).toHaveLength(0);
  });

  it("stores markup as plain text (AC1.5)", async () => {
    const res = await post({ body: { title: "<b>x</b>" } });
    expect((await res.json()).title).toBe("<b>x</b>");
  });
});

describe("PATCH /api/todos/:id", () => {
  it("completes and un-completes, and the change persists (AC2.3)", async () => {
    const t = await add(asha.id);
    const done = await patch(t.id, { body: { completed: true } });
    expect(done.status).toBe(200);
    const body = await done.json();
    expect(body.id).toBe(t.id);
    expect(Date.parse(body.completedAt)).not.toBeNaN();
    expect((await rows())[0]!.completedAt).toBeInstanceOf(Date);

    const open = await patch(t.id, { body: { completed: false } });
    expect((await open.json()).completedAt).toBeNull();
    expect((await rows())[0]!.completedAt).toBeNull();
  });

  it.each([{}, { completed: "yes" }, { completed: 1 }, null])("refuses body %j with 400 and changes nothing", async (body) => {
    const t = await add(asha.id);
    const res = await patch(t.id, { body });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    expect((await rows())[0]!.completedAt).toBeNull();
  });

  it("answers 404 for an id that does not exist or is malformed", async () => {
    expect((await patch(crypto.randomUUID(), { body: { completed: true } })).status).toBe(404);
    expect((await patch("nope", { body: { completed: true } })).status).toBe(404);
  });
});

describe("DELETE /api/todos/:id", () => {
  it("removes the item and it stays gone (AC3.2)", async () => {
    const t = await add(asha.id);
    const res = await del(t.id);
    expect(res.status).toBe(204);
    expect(await rows()).toHaveLength(0);
    expect((await del(t.id)).status).toBe(404);
  });
});

describe("A uses B's item id (AC5.3)", () => {
  it("PATCH and DELETE answer 404 with no item data, and B's row is unchanged", async () => {
    const bt = await add(ben.id, "Ben's secret plan");
    const before = await rows();

    for (const res of [
      await patch(bt.id, { cookie: ashaCookie, body: { completed: true } }),
      await patch(bt.id, { cookie: ashaCookie, body: { completed: false } }),
      await del(bt.id, { cookie: ashaCookie }),
    ]) {
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).not.toContain("Ben's secret plan");
      expect(text).not.toContain(bt.id);
      expect(text).not.toContain(ben.id);
      expect(JSON.parse(text)).toEqual({ error: "not_found" });
    }
    expect(await rows()).toEqual(before);
  });

  it("the 404 for a foreign id is identical to the 404 for a missing id", async () => {
    const bt = await add(ben.id);
    const foreign = await patch(bt.id, { body: { completed: true } });
    const missing = await patch(crypto.randomUUID(), { body: { completed: true } });
    expect(foreign.status).toBe(missing.status);
    expect(await foreign.json()).toEqual(await missing.json());
  });

  it("the owner can still act on their own item", async () => {
    const bt = await add(ben.id);
    expect((await patch(bt.id, { cookie: benCookie, body: { completed: true } })).status).toBe(200);
    expect((await del(bt.id, { cookie: benCookie })).status).toBe(204);
  });
});

describe("no valid session (AC5.4)", () => {
  const bad: [string, string | null][] = [
    ["no cookie", null],
    ["a tampered cookie", `${ashaCookie}x`],
    ["a cookie for a user that no longer exists", `session=PLACEHOLDER`],
  ];

  it.each(bad)("answers 401 with no item data for %s", async (_name, cookie) => {
    let c = cookie;
    if (c === "session=PLACEHOLDER") c = `session=${await signSession(crypto.randomUUID(), secret)}`;
    const t = await add(asha.id, "Private");
    for (const res of [
      await post({ cookie: c, body: { title: "x" } }),
      await patch(t.id, { cookie: c, body: { completed: true } }),
      await del(t.id, { cookie: c }),
    ]) {
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });
    }
    expect(await rows()).toHaveLength(1);
    expect((await rows())[0]!.completedAt).toBeNull();
  });
});

describe("Origin check", () => {
  it("refuses a foreign or missing Origin on every route with 403 and changes nothing", async () => {
    const t = await add(asha.id);
    for (const o of ["https://evil.example", null]) {
      expect((await post({ origin: o, body: { title: "x" } })).status).toBe(403);
      expect((await patch(t.id, { origin: o, body: { completed: true } })).status).toBe(403);
      expect((await del(t.id, { origin: o })).status).toBe(403);
    }
    expect(await rows()).toHaveLength(1);
    expect((await rows())[0]!.completedAt).toBeNull();
  });
});

describe("logs (AC5.5)", () => {
  it("a server error answers 500 and logs no cookie, secret, id or title", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = await add(asha.id);
    const cookieValue = ashaCookie.split("=")[1]!;
    vi.mocked(data.addTodo).mockRejectedValueOnce(new Error(`boom ${cookieValue} ${secret} ${asha.id} Secret title`));

    const res = await post({ body: { title: "Secret title" } });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server_error" });

    const out = spy.mock.calls.flat().map(String).join(" ");
    expect(out).toContain("POST /api/todos");
    for (const leak of [cookieValue, secret, asha.id, "Secret title", t.id]) expect(out).not.toContain(leak);
  });
});
