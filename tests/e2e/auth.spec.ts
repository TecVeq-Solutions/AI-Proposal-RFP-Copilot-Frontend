import { expect, test } from "@playwright/test";
import { loginAs, registerAndLogin, uniqueEmail } from "./helpers/auth";

test("register → org creation → dashboard", async ({ page }) => {
  await registerAndLogin(page);
  await expect(page.getByRole("link", { name: "Proposals" }).first()).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  const { email } = await registerAndLogin(page);
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await loginAs(page, email, "WrongPass1");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logout returns to the login page", async ({ page }) => {
  await registerAndLogin(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("/dashboard is protected without auth", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown user cannot log in", async ({ page }) => {
  await loginAs(page, uniqueEmail("nobody"));
  await expect(page).toHaveURL(/\/login/);
});
