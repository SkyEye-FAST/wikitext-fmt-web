import { expect, test } from "@playwright/test";

test("runs the critical formatter workflow", async ({ page }) => {
  await page.goto(".");
  await expect(page).toHaveTitle(/Wikitext Formatter/);
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Web 0.2.0 · Formatter 0.7.0");

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.locator('[data-testid="source-editor"] .cm-content').click();
  await page.keyboard.insertText("stale edit");
  await expect(page.getByText("Output is outdated")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply output" })).toBeDisabled();
  await page.getByLabel("Language").selectOption("zh-Hans");
  await expect(page.getByText("输出已过期")).toBeVisible();
  await page.getByLabel("语言").selectOption("zh-Hant");
  await expect(page.getByText("輸出已過期")).toBeVisible();
  await page.getByLabel("語言").selectOption("en");

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
