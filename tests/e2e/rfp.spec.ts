import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

// The full analyze → compliance matrix → export flow needs a processed document and a live AI
// service (OpenAI key), so it is not automated here. This covers the reachable, AI-free part;
// extend it once a seeded, already-analyzed RFP fixture exists.
test("RFP analyzer page loads for a new organization", async ({ page }) => {
  await registerAndLogin(page);
  await page.goto("/dashboard/rfp-analyzer");
  await expect(page.getByRole("button", { name: /analyze rfp/i }).first()).toBeVisible();
});
