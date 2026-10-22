import { expect, test, type Page } from "@playwright/test";

const status = (page: Page) => page.getByRole("status");
const outputText = (page: Page) =>
  page.locator('[data-testid="output-editor"] .cm-content').evaluate((content) =>
    [...content.querySelectorAll(".cm-line")]
      .map((line) => line.textContent)
      .join("\n"),
  );

test.beforeEach(async ({ page }) => {
  await page.goto(".");
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
});

test("formats the example, shows changes, and persists settings without source", async ({ page }) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Formatted");
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.getByRole("tab", { name: /^Changes/ }).click();
  await expect(page.getByTestId("diff-view")).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Line width").fill("88");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(status(page)).toContainText("Settings changed after this result was made");
  await page.getByRole("tab", { name: "Result" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText(/Formatted|No changes needed/);

  await page.reload();
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(page.locator('[data-testid="source-editor"] .cm-content')).toHaveText("");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Line width")).toHaveValue("88");
});

test("uses the complete preset for references and interlanguage footers", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("radio", { name: "Complete" }).check();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.locator(".report-tools")).toContainText("Complete preset");

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "Production.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from('<ref name="a"/>\n[[en:Example]]\n\nBody\n'),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Formatted");
  await expect.poll(() => outputText(page)).toBe('<ref name="a" />\n\nBody\n\n[[en:Example]]\n');

  await fileInput.setInputFiles({
    name: "Generic-interwiki.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from("[[w:Example]]\n\nBody\n"),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("No changes needed");
  await expect.poll(() => outputText(page)).toBe("[[w:Example]]\n\nBody\n");
});

test("opens a file dropped onto the workspace", async ({ page }) => {
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["==Dropped title==\n"], "Dropped.wiki", { type: "text/plain" }));
    return transfer;
  });
  const workspace = page.locator("main.workspace");
  await workspace.dispatchEvent("dragenter", { dataTransfer });
  await workspace.dispatchEvent("dragover", { dataTransfer });
  await workspace.dispatchEvent("drop", { dataTransfer });
  await expect(page.locator('[data-testid="source-editor"] .cm-content')).toContainText("==Dropped title==");
  await expect(page.getByText("Opened Dropped.wiki")).toBeVisible();
});

test("shows no-change and real structured fail-closed states", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "Canonical.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from("== Title ==\n"),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("No changes needed");

  await fileInput.setInputFiles({
    name: "Malformed.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from([0]),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Left unchanged");
  // A declined change opens the report on its own.
  await expect(page.getByText("Why your text was left unchanged")).toBeVisible();
  await page.getByText("Technical details").click();
  await expect(page.getByText("input-roundtrip")).toBeVisible();
  await expect(page.getByText("Stage: initial-roundtrip")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace source" })).toBeDisabled();
});

test("switches, persists, and restores the interface language", async ({ page }) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByLabel("Language").selectOption("zh-Hans");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByLabel("语言")).toHaveValue("zh-Hans");
  await expect(page.locator("#source-stats")).toContainText("行");
  await expect(page.locator(".report-tools")).toContainText("默认");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /MediaWiki维基文本/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("wikitext-formatter.settings") ?? "null") as { language?: string });
  expect(stored.language).toBe("zh-Hans");
  expect(await page.evaluate(() => localStorage.getItem("wikitext-formatter.locale"))).toBeNull();

  await page.reload();
  await expect(page.getByLabel("语言")).toHaveValue("zh-Hans");
  await page.getByLabel("语言").selectOption("zh-Hant");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("heading", { name: "貼上維基文字即可開始" })).toBeVisible();
  await expect(page.locator(".report-tools")).toContainText("預設");
});

test("keeps an iterative formatting run tied to its submitted source", async ({ page }) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Formatted");

  const source = page.locator('[data-testid="source-editor"] .cm-content');
  await source.click();
  await page.keyboard.insertText("stale edit");
  await expect(status(page)).toContainText("Out of date");
  await expect(page.getByRole("button", { name: "Replace source" })).toBeDisabled();
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.getByRole("tab", { name: /^Changes/ }).click();
  await expect(page.getByTestId("diff-view")).toBeVisible();
  await expect(page.getByText("Compared with the source as it was when you last formatted.")).toBeVisible();

  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText(/Formatted|No changes needed/);
  await expect(status(page)).not.toContainText("Out of date");
  const sourceBeforeApply = await source.innerText();
  await page.getByRole("button", { name: "Replace source" }).click();
  await expect(status(page)).toContainText("Source replaced");
  await expect(source).toBeFocused();
  await page.keyboard.press("Control+z");
  await expect.poll(() => source.innerText()).toBe(sourceBeforeApply);
});

test("clears the source and undoes the clear from the notification", async ({ page }) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  const source = page.locator('[data-testid="source-editor"] .cm-content');
  await expect(source).toContainText("Example article");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(source).toHaveText("");
  await expect(page.getByRole("heading", { name: "Paste wikitext to get started" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(source).toContainText("Example article");
});

test("traps settings focus and restores it on Escape", async ({ page }) => {
  const settingsButton = page.getByRole("button", { name: "Settings" });
  await settingsButton.click();
  await expect(page.getByRole("button", { name: "Close settings" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Reset everything" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
  await expect(settingsButton).toBeFocused();
});

test("shows one pane at a time in a narrow mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  const sourceBox = await page.getByTestId("source-editor").boundingBox();
  expect(sourceBox?.height).toBeGreaterThan(250);
  await expect(page.getByTestId("output-editor")).toBeHidden();

  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Formatted");
  // A finished run brings the result into view.
  await expect(page.getByTestId("output-editor")).toBeVisible();
  await expect(page.getByTestId("source-editor")).toBeHidden();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.getByTestId("source-editor")).toBeVisible();

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);
});

test("warns for a large document and recovers after Stop", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "Large.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from("plain text\n".repeat(100_001)),
  });
  await expect(page.getByText(/This file is over 1 MB/)).toBeVisible();

  await page.getByRole("button", { name: "Format" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(status(page)).toContainText(/Formatting stopped/);

  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(status(page)).toContainText("Formatted");
});
