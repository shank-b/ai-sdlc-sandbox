import { expect, type Page } from "@playwright/test";

/** Signs in through the sign-in screen, as a user would. */
export async function signInAs(page: Page, name: string) {
  await page.goto("/auth/signin");
  await page.getByRole("button", { name: `Continue as ${name}` }).click();
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

/** Adds an item through the form and waits for it to appear. */
export async function addItem(page: Page, title: string) {
  await page.getByLabel("New to-do").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}
