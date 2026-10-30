import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "../support/session";

// The database is shared across the run and this file's tests run serially, so tests assert only on
// the items they create (AC1.6 empties Ben's list first).
const add = async (page: Page, title: string) => {
  await page.getByLabel("New to-do").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
};

test("AC1.1 / AC1.8: adding shows the item in Open and clears the field; Enter submits", async ({ page }) => {
  await signInAs(page, "Asha");
  const field = page.getByLabel("New to-do");
  await add(page, "Buy milk");
  await expect(field).toHaveValue("");
  await field.fill("Call the bank");
  await field.press("Enter");
  await expect(page.getByText("Call the bank", { exact: true })).toBeVisible();
  await expect(field).toHaveValue("");
  await expect(page.getByRole("heading", { name: /^Open \(/ })).toBeVisible();
});

test("AC1.2: an empty title shows 'Title is required' and keeps focus on the field", async ({ page }) => {
  await signInAs(page, "Ben");
  const field = page.getByLabel("New to-do");
  await field.fill("   ");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Title is required" })).toBeVisible();
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-invalid", "true");
});

test("AC1.4: a title over 140 characters is refused with a message naming the limit", async ({ page }) => {
  await signInAs(page, "Ben");
  const field = page.getByLabel("New to-do");
  await field.fill("x".repeat(141));
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "140" })).toBeVisible();
  await expect(page.getByText("x".repeat(141))).toHaveCount(0);
});

test("AC1.5: markup in a title is shown as literal text", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "<b>x</b>");
  await expect(page.locator("li b")).toHaveCount(0);
});

test("AC1.7: a new item shows its created time in en-IN format, IST", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Timed item");
  const row = page.getByRole("listitem").filter({ hasText: "Timed item" });
  await expect(row).toContainText(/Added \d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (am|pm) IST/);
});

test("AC2.1 / AC2.2 / AC2.3: complete by Space, persists on reload, un-complete returns it to Open", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Water plants");
  const box = page.getByRole("checkbox", { name: "Mark Water plants done" });
  await box.focus();
  const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && r.ok());
  await page.keyboard.press("Space");
  await saved;
  const done = page.getByRole("checkbox", { name: "Mark Water plants open" });
  await expect(done).toBeChecked();
  const completedGroup = page.locator("section", { has: page.getByRole("heading", { name: /^Completed \(/ }) });
  await expect(completedGroup.getByText("Water plants")).toBeVisible();
  await expect(completedGroup.getByText("Water plants")).toHaveCSS("text-decoration-line", "line-through");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Mark Water plants open" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Mark Water plants open" }).click();
  const openGroup = page.locator("section", { has: page.getByRole("heading", { name: /^Open \(/ }) });
  await expect(openGroup.getByText("Water plants")).toBeVisible();
  await expect(openGroup.getByText("Water plants")).not.toHaveCSS("text-decoration-line", "line-through");
});

test("AC2.1: clicking the title ticks the item", async ({ page }) => {
  await signInAs(page, "Ben");
  await add(page, "Click the title");
  await page.getByText("Click the title", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Mark Click the title open" })).toBeChecked();
});

test("AC2.4: a failed save shows an error with retry and keeps the previous state", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Fails to save");
  await page.route("**/api/todos/*", (route) =>
    route.request().method() === "PATCH" ? route.fulfill({ status: 500, json: { error: "server_error" } }) : route.continue(),
  );
  await page.getByRole("checkbox", { name: "Mark Fails to save done" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't save that change. Your list is unchanged." })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Mark Fails to save done" })).not.toBeChecked();
  await page.unroute("**/api/todos/*");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("checkbox", { name: "Mark Fails to save open" })).toBeChecked();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("AC2.5: checkbox plus title is at least 44 by 44 px at 390 px wide", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await signInAs(page, "Ben");
  await add(page, "Tap target");
  const box = await page.getByRole("listitem").filter({ hasText: "Tap target" }).locator("label").boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("AC1.6: an empty list shows the empty-state message and the add field", async ({ page, baseURL }) => {
  await signInAs(page, "Ben");
  // the in-memory database outlives a run on a reused dev server, so empty Ben's list through the API
  for (const id of await page.locator("li[data-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")!))) {
    const res = await page.request.delete(`/api/todos/${id}`, { headers: { origin: baseURL! } });
    expect(res.status()).toBe(204);
  }
  await page.reload();
  await expect(page.getByText("Nothing here yet. Add your first to-do above.")).toBeVisible();
  await expect(page.getByLabel("New to-do")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
});

test("AC4.1 / AC4.3 / AC7.3: two labelled groups, completed marked beyond colour, Delete named by title, 4.5:1 contrast", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Group open");
  await add(page, "Group done");
  await page.getByRole("checkbox", { name: "Mark Group done done" }).click();
  const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(headings.findIndex((h) => /^Open/.test(h))).toBeLessThan(headings.findIndex((h) => /^Completed/.test(h)));
  await expect(page.getByRole("button", { name: "Delete Group open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Group done" })).toBeVisible();
  const ratio = await page.getByText("Group done", { exact: true }).evaluate((el) => {
    const lum = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const fg = lum(getComputedStyle(el).color);
    const bg = lum(getComputedStyle(document.body).backgroundColor);
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
