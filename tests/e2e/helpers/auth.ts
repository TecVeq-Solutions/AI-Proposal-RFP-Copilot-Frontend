import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "Password1";

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

export async function loginAs(page: Page, email: string, password: string = TEST_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

/** Registers a fresh user, creates their organization and lands on the dashboard. */
export async function registerAndLogin(
  page: Page,
  opts: { email?: string; password?: string; promoCode?: string } = {}
): Promise<{ email: string; password: string }> {
  const email = opts.email ?? uniqueEmail();
  const password = opts.password ?? TEST_PASSWORD;

  await page.goto("/register");
  await page.getByLabel("First Name").fill("E2E");
  await page.getByLabel("Last Name").fill("Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  if (opts.promoCode) await page.getByLabel(/promo code/i).fill(opts.promoCode);
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.getByLabel("Organization Name").fill(`E2E Org ${Date.now()}`);
  await page.getByRole("button", { name: "Create Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return { email, password };
}
