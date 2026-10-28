import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canAccess, filterByOwner, formatIst, groupAndOrder, MAX_TITLE_LENGTH, validateTitle, type Todo } from "./rules";

describe("validateTitle", () => {
  it("rejects empty and whitespace-only titles (AC1.2)", () => {
    expect(validateTitle("")).toEqual({ ok: false, error: "title_required" });
    expect(validateTitle(" \t\n ")).toEqual({ ok: false, error: "title_required" });
  });
  it("trims the saved title (AC1.3)", () => {
    expect(validateTitle("  buy milk  ")).toEqual({ ok: true, title: "buy milk" });
  });
  it("allows 140 characters after trimming and rejects 141 (AC1.4)", () => {
    expect(MAX_TITLE_LENGTH).toBe(140);
    expect(validateTitle(` ${"a".repeat(140)} `)).toEqual({ ok: true, title: "a".repeat(140) });
    expect(validateTitle("a".repeat(141))).toEqual({ ok: false, error: "title_too_long" });
  });
});

describe("validateTitle code points (AC1.4)", () => {
  it("counts emoji as one character, like Postgres char_length", () => {
    expect(validateTitle("😀".repeat(140))).toEqual({ ok: true, title: "😀".repeat(140) });
    expect(validateTitle("😀".repeat(141))).toEqual({ ok: false, error: "title_too_long" });
  });
});

describe("formatIst", () => {
  it("formats in en-IN, IST (AC1.7)", () => {
    expect(formatIst(new Date("2026-10-22T13:42:00Z"))).toBe("22 Oct 2026, 7:12 pm IST");
  });
  it("crosses midnight: 18:29Z is still the 22nd, 18:30Z is the 23rd in IST", () => {
    expect(formatIst(new Date("2026-10-22T18:29:00Z"))).toBe("22 Oct 2026, 11:59 pm IST");
    expect(formatIst(new Date("2026-10-22T18:30:00Z"))).toBe("23 Oct 2026, 12:00 am IST");
  });
});

describe("canAccess", () => {
  it("allows only the owner (AC5.3)", () => {
    expect(canAccess("a", "a")).toBe(true);
    expect(canAccess("a", "b")).toBe(false);
    expect(canAccess("a", "")).toBe(false);
    expect(canAccess("", "")).toBe(false);
  });
});

const todo = fc.record({
  id: fc.uuid(),
  userId: fc.constantFrom("a", "b", "c"),
  title: fc.string({ minLength: 1, maxLength: 20 }),
  createdAt: fc.date({ min: new Date(0), max: new Date("2100-01-01"), noInvalidDate: true }),
  completedAt: fc.option(fc.date({ min: new Date(0), max: new Date("2100-01-01"), noInvalidDate: true }), { nil: null }),
});

describe("groupAndOrder properties", () => {
  it("lists all open items before completed, same items out as in (AC4.1)", () => {
    fc.assert(fc.property(fc.array(todo), (items) => {
      const { open, completed } = groupAndOrder(items);
      expect(open.every((t) => t.completedAt === null)).toBe(true);
      expect(completed.every((t) => t.completedAt !== null)).toBe(true);
      expect([...open, ...completed].map((t) => t.id).sort()).toEqual(items.map((t) => t.id).sort());
    }));
  });
  it("open newest first, completed most recently completed first (AC4.2)", () => {
    fc.assert(fc.property(fc.array(todo), (items) => {
      const { open, completed } = groupAndOrder(items);
      for (let i = 1; i < open.length; i++) expect(open[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(open[i].createdAt.getTime());
      for (let i = 1; i < completed.length; i++) expect(completed[i - 1].completedAt!.getTime()).toBeGreaterThanOrEqual(completed[i].completedAt!.getTime());
    }));
  });
  it("breaks ties by id, whatever the input order (AC4.2)", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    const mk = (id: string, completedAt: Date | null): Todo => ({ id, userId: "a", title: "t", createdAt: d, completedAt });
    for (const completedAt of [null, d]) {
      const items = ["c", "a", "b"].map((id) => mk(id, completedAt));
      const g = (xs: Todo[]) => groupAndOrder(xs)[completedAt ? "completed" : "open"].map((t) => t.id);
      expect(g(items)).toEqual(g([...items].reverse()));
    }
  });
  it("does not mutate its input", () => {
    fc.assert(fc.property(fc.array(todo), (items) => {
      const copy = [...items];
      groupAndOrder(items);
      expect(items).toEqual(copy);
    }));
  });
});

describe("filterByOwner property (AC5.2)", () => {
  it("returns exactly the caller's items", () => {
    fc.assert(fc.property(fc.array(todo), fc.constantFrom("a", "b", "c"), (items: Todo[], user) => {
      const mine = filterByOwner(items, user);
      expect(mine.every((t) => t.userId === user)).toBe(true);
      expect(mine.length).toBe(items.filter((t) => t.userId === user).length);
    }));
  });
});
