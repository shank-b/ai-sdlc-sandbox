import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "../support/session";

// The database is shared across the run, so every item title carries a per-run suffix and tests
// assert only on their own items.
const run = Date.now().toString(36);
const title = (name: string) => `${name} ${run}`;

const add = async (page: Page, text: string) => {
  await page.getByLabel("New to-do").fill(text);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
};

test("AC5.1: items persist across sign-out and sign-in, and in a fresh browser context", async ({ page, browser }) => {
  const [open, done] = [title("Persist open"), title("Persist done")];
  await signInAs(page, "Asha");
  await add(page, open);
  await add(page, done);
  const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && r.ok());
  await page.getByRole("checkbox", { name: `Mark ${done} done` }).click();
  await saved;
  await expect(page.getByRole("checkbox", { name: `Mark ${done} open` })).toBeChecked();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await signInAs(page, "Asha");
  await expect(page.getByText(open, { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: `Mark ${done} open` })).toBeChecked();

  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await signInAs(second, "Asha");
    await expect(second.getByText(open, { exact: true })).toBeVisible();
    await expect(second.getByRole("checkbox", { name: `Mark ${done} open` })).toBeChecked();
  } finally {
    await other.close();
  }
});

test("AC5.2: each user sees only their own items, in both directions", async ({ browser }) => {
  const asha = ["Asha one", "Asha two <i>", "Asha ünï 3"].map(title);
  const ben = ["Ben one", "Ben two & more", "Ben 3"].map(title);
  const [ctxA, ctxB] = [await browser.newContext(), await browser.newContext()];
  try {
    const [a, b] = [await ctxA.newPage(), await ctxB.newPage()];
    await signInAs(a, "Asha");
    await signInAs(b, "Ben");
    for (const t of asha) await add(a, t);
    for (const t of ben) await add(b, t);
    await a.reload();
    await b.reload();
    for (const t of asha) {
      await expect(a.getByText(t, { exact: true })).toBeVisible();
      await expect(b.getByText(t, { exact: true })).toHaveCount(0);
    }
    for (const t of ben) {
      await expect(b.getByText(t, { exact: true })).toBeVisible();
      await expect(a.getByText(t, { exact: true })).toHaveCount(0);
    }
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

for (const [name, width, height] of [["390 px", 390, 800], ["1280 px", 1280, 800]] as const) {
  test(`AC7.1: no horizontal scroll and nothing clipped at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await signInAs(page, "Asha");
    const long = `${name} ${run} ${"wordy ".repeat(20)}`.trim().slice(0, 140);
    await add(page, long);
    await add(page, title("Short"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // every control is inside the viewport horizontally
    for (const el of await page.getByRole("button").or(page.getByRole("checkbox")).or(page.getByLabel("New to-do")).all()) {
      const box = await el.boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    // the long title wraps instead of being cut off
    const row = page.getByRole("listitem").filter({ hasText: long });
    const clipped = await row.first().evaluate((li) => li.scrollWidth > li.clientWidth);
    expect(clipped).toBe(false);
  });
}

test("AC7.2: a keyboard-only run signs in, adds, completes, un-completes and deletes", async ({ page }) => {
  const item = title("Keyboard item");
  await page.goto("/auth/signin");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Continue as Asha" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Signed in as Asha")).toBeVisible();

  await page.getByLabel("New to-do").focus();
  await page.keyboard.type(item);
  await page.keyboard.press("Enter");
  const row = page.getByRole("listitem").filter({ hasText: item });
  await expect(row).toBeVisible();

  const box = row.getByRole("checkbox");
  await box.focus();
  const completed = page.waitForResponse((r) => r.request().method() === "PATCH" && r.ok());
  await page.keyboard.press("Space");
  await completed;
  await expect(page.getByRole("checkbox", { name: `Mark ${item} open` })).toBeChecked();
  await page.getByRole("checkbox", { name: `Mark ${item} open` }).focus();
  const reopened = page.waitForResponse((r) => r.request().method() === "PATCH" && r.ok());
  await page.keyboard.press("Space");
  await reopened;
  await expect(page.getByRole("checkbox", { name: `Mark ${item} done` })).not.toBeChecked();

  await page.getByRole("button", { name: `Delete ${item}` }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(item, { exact: true })).toHaveCount(0);
});

test("AC7.2: the tab order is sign out, add field, Add, then checkbox and Delete per item", async ({ page }) => {
  const [first, second] = [title("Order one"), title("Order two")];
  await signInAs(page, "Ben");
  await add(page, first);
  await add(page, second);
  await page.reload();
  await expect(page.getByText(second, { exact: true })).toBeVisible();

  // Ben's list may hold items from other tests; the pattern must hold across all of them.
  const rows = await page.getByRole("listitem").count();
  const seen: string[] = [];
  for (let i = 0; i < 3 + rows * 2; i++) {
    await page.keyboard.press("Tab");
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el.tagName === "INPUT" && el.getAttribute("type") === "checkbox") return "checkbox";
        if (el.tagName === "INPUT") return "field";
        if (el.classList.contains("delete")) return "delete";
        return el.textContent?.trim() ?? el.tagName;
      }),
    );
  }
  expect(seen.slice(0, 3)).toEqual(["Sign out", "field", "Add"]);
  expect(seen.slice(3)).toEqual(Array.from({ length: rows }, () => ["checkbox", "delete"]).flat());
});
