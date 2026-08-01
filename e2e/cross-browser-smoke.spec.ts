import { expect, test } from "@playwright/test";

test("runs the critical formatter workflow", async ({ page }) => {
  await page.goto(".");
  await expect(page).toHaveTitle(/Wikitext Formatter/);
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Web 0.1.1 · Formatter 0.6.0");

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.locator('input[type="file"]').setInputFiles({
    name: "Malformed.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from([0]),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Fail-closed")).toBeVisible();
  await expect(page.getByText("input-roundtrip")).toBeVisible();

  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Example.formatted.wikitext");
});
