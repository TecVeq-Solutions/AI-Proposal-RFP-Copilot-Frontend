import path from "node:path";
import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample-rfp.pdf");

test.describe("documents", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/dashboard/documents");
  });

  test("upload PDF → status becomes Ready", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await page.getByRole("button", { name: /upload/i }).last().click();
    // Needs the ai-service (text extraction + embeddings) to be running.
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60_000 });
  });

  test("invalid file type shows an error", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ not a document"),
    });
    await expect(page.getByText(/unsupported file type/i)).toBeVisible();
  });
});
