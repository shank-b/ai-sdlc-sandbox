import { expect, test } from "@playwright/test";

// Runs against the second server (no accounts seeded), see playwright.config.ts.
test("AC6.5: no accounts shows the setup message, no buttons, and no list", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page.getByText("No accounts set up. Add accounts to your local seed file.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/signin$/);
});
