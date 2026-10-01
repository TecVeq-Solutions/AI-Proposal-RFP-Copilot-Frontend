import { expect, test } from "@playwright/test";

test("landing page renders all sections and CTA leads to /register", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Win More RFPs");
  await expect(page.getByRole("heading", { name: "Smart RFP Analysis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("$149")).toBeVisible();

  await page.getByRole("link", { name: "Start Free 14-Day Trial" }).click();
  await expect(page).toHaveURL(/\/register/);
});

test("docs redirect to getting started and sidebar navigates", async ({ page }) => {
  await page.goto("/docs");
  await expect(page).toHaveURL(/\/docs\/getting-started/);
  await page.getByRole("link", { name: "FAQ" }).click();
  await expect(page.getByRole("heading", { name: "FAQ", level: 1 })).toBeVisible();
});

test("beta waitlist form submits", async ({ page }) => {
  await page.goto("/beta");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(`waitlist-${Date.now()}@test.local`);
  await page.getByRole("button", { name: "Request access" }).click();
  await expect(page.getByRole("status")).toContainText("be in touch");
});
