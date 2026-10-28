import { expect, test } from "@playwright/test";
import { signInAs } from "../support/session";

test("AC6.1: the sign-in screen lists exactly the seeded accounts", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page.getByRole("heading", { level: 1, name: "Who are you?" })).toBeVisible();
  const buttons = page.getByRole("main").getByRole("button");
  await expect(buttons).toHaveText(["Continue as Asha", "Continue as Ben"]);
});

test("AC6.2: picking an account lands on that account's list", async ({ page }) => {
  await signInAs(page, "Asha");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Signed in as Ben")).toHaveCount(0);
});

test("AC6.3: Sign out ends the session and the list is unreachable", async ({ page }) => {
  await signInAs(page, "Ben");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByText(/Signed in as/)).toHaveCount(0);
});

test("AC6.4: a failed sign-in shows the message and stays on sign-in", async ({ page }) => {
  await page.route("**/auth/session", (route) => route.fulfill({ status: 500, json: { error: "server_error" } }));
  await page.goto("/auth/signin");
  await page.getByRole("button", { name: "Continue as Asha" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Sign-in failed. Pick an account to try again.");
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByRole("button", { name: "Continue as Asha" })).toBeVisible();
});

test("AC5.4: with no session the list page redirects to sign-in and shows no item data", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByText(/Signed in as/)).toHaveCount(0);
  const api = await request.get("/api/todos");
  expect(api.status()).toBe(401);
  expect(await api.json()).toEqual({ error: "unauthorized" });
});

test("a tampered cookie is treated as no session", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "session", value: "3f2b8f0e-1c3d-4a5b-9c7d-0123456789ab.9999999999.forged", url: baseURL! }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/signin$/);
});

test("the session cookie is HttpOnly and SameSite=Lax", async ({ page, context }) => {
  await signInAs(page, "Asha");
  const cookie = (await context.cookies()).find((c) => c.name === "session")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
});
