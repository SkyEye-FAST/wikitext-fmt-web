import { expect, test } from "@playwright/test";

test("runs the critical formatter workflow", async ({ page }) => {
  await page.goto(".");
  await expect(page).toHaveTitle(/Wikitext Formatter/);
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByRole("status")).toContainText("Formatted");
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");
  await expect(page.getByRole("list", { name: "Changes by rule" })).toContainText("Templates");
  await page.getByRole("button", { name: "Default preset" }).click();
  await expect(page.getByText("wikitext-fmt 0.10.0 · web app 0.5.0")).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();

  await page.locator('[data-testid="source-editor"] .cm-content').click();
  await page.keyboard.insertText("stale edit");
  await expect(page.getByRole("status")).toContainText("Out of date");
  await expect(page.getByRole("button", { name: "Replace source" })).toBeDisabled();
  await page.getByLabel("Language").selectOption("zh-Hans");
  await expect(page.getByRole("status")).toContainText("已过期");
  await page.getByLabel("语言").selectOption("zh-Hant");
  await expect(page.getByRole("status")).toContainText("已過期");
  await page.getByLabel("語言").selectOption("en");

  await page.locator('input[type="file"]').setInputFiles({
    name: "Malformed.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from([0]),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByRole("status")).toContainText("Not formatted");
  await expect(page.getByRole("status")).toContainText("input-roundtrip");

  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByRole("status")).toContainText("Formatted");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Example.formatted.wikitext");
});
