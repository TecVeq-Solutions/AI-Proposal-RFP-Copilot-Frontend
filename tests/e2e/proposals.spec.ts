import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

test("create a proposal and land in the editor", async ({ page }) => {
  await registerAndLogin(page);
  await page.goto("/dashboard/proposals");

  await page.getByRole("button", { name: /new proposal/i }).first().click();
  await page.getByLabel(/title/i).fill("E2E Proposal");
  await page.getByRole("button", { name: /^create$/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/proposals\/.+\/edit/);
});

test("Ctrl+K opens the command palette and navigates", async ({ page }) => {
  await registerAndLogin(page);
  await page.keyboard.press("Control+k");
  await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
  await page.getByRole("option", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings/);
});

test("feedback widget submits", async ({ page }) => {
  await registerAndLogin(page);
  await page.getByRole("button", { name: "Give Feedback" }).click();
  await page.getByRole("radio", { name: "5 stars" }).click();
  await page.getByLabel("Your feedback").fill("Works great");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Thank you! Your feedback helps us improve.")).toBeVisible();
});
