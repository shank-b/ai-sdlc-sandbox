import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "../support/session";

// The database is shared across the run, so each test creates and asserts on its own item.
const add = async (page: Page, title: string) => {
  await page.getByLabel("New to-do").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
};

test("AC3.1: Delete opens a dialog naming the item with Cancel and Delete", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Name me in the dialog");
  await page.getByRole("button", { name: "Delete Name me in the dialog" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Delete “Name me in the dialog”?");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
});

test("AC3.2: confirming removes the item and it stays gone after a reload", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Delete me for good");
  await page.getByRole("button", { name: "Delete Delete me for good" }).click();
  const gone = page.waitForResponse((r) => r.request().method() === "DELETE" && r.status() === 204);
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await gone;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Delete me for good", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Delete me for good", { exact: true })).toHaveCount(0);
});

for (const how of ["Cancel", "Esc"] as const) {
  test(`AC3.3: ${how} leaves the list unchanged and returns focus to that item's Delete button`, async ({ page }) => {
    await signInAs(page, "Asha");
    await add(page, `Keep me via ${how}`);
    const trigger = page.getByRole("button", { name: `Delete Keep me via ${how}` });
    await trigger.click();
    if (how === "Cancel") await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    else await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(`Keep me via ${how}`, { exact: true })).toBeVisible();
    await expect(trigger).toBeFocused();
  });
}

test("AC3.4: focus starts on Cancel and Tab cannot leave the dialog", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Trap the focus");
  await page.getByRole("button", { name: "Delete Trap the focus" }).click();
  const dialog = page.getByRole("dialog");
  const inDialog = () => page.evaluate(() => !!document.activeElement?.closest("dialog"));
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(await inDialog()).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await inDialog()).toBe(true);
});

test("AC3.5: a failed delete shows an error and the item remains; Retry deletes it", async ({ page }) => {
  await signInAs(page, "Asha");
  await add(page, "Survives a failure");
  await page.route("**/api/todos/*", (route) =>
    route.request().method() === "DELETE" ? route.fulfill({ status: 500, json: { error: "server_error" } }) : route.continue(),
  );
  await page.getByRole("button", { name: "Delete Survives a failure" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert").filter({ hasText: "Couldn't save that change" })).toBeVisible();
  await expect(page.getByText("Survives a failure", { exact: true })).toBeVisible();
  await page.unroute("**/api/todos/*");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Survives a failure", { exact: true })).toHaveCount(0);
});
