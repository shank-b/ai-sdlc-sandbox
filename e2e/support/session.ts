import { expect, type Page } from "@playwright/test";

/** Signs in through the sign-in screen, as a user would. */
export async function signInAs(page: Page, name: string) {
  await page.goto("/auth/signin");
  await page.getByRole("button", { name: `Continue as ${name}` }).click();
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}
