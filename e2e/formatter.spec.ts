import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto(".");
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
});

test("formats the example, shows diff, and persists settings without source", async ({ page }) => {
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.getByRole("button", { name: "Diff" }).click();
  await expect(page.getByTestId("diff-view")).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Line width").fill("88");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Diff" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText(/Formatted with changes|Already formatted/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(page.locator('[data-testid="source-editor"] .cm-content')).toHaveText("");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Line width")).toHaveValue("88");
});

test("formats with the keyboard shortcut", async ({ page }) => {
  await page.getByRole("button", { name: "Load example" }).click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Formatted with changes")).toBeVisible();
});

test("opens a local file and downloads output without transmitting source", async ({ page }) => {
  const transmittedBodies: string[] = [];
  page.on("request", (request) => {
    const body = request.postData();
    if (body) transmittedBodies.push(body);
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "Local.wiki",
    mimeType: "text/plain",
    buffer: Buffer.from("==Private local title==\n"),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Local.formatted.wiki");
  expect(transmittedBodies.join("\n")).not.toContain("Private local title");
});

test("shows already-formatted and real structured fail-closed states", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "Canonical.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from("== Title ==\n"),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Already formatted")).toBeVisible();

  await fileInput.setInputFiles({
    name: "Malformed.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from([0]),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Fail-closed")).toBeVisible();
  await expect(page.getByText("input-roundtrip")).toBeVisible();
  await expect(page.getByText("Stage: initial-roundtrip")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply output" })).toBeDisabled();
});

test("switches and persists the dark theme", async ({ page }) => {
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByLabel("Theme")).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("switches, persists, and restores the interface language", async ({ page }) => {
  await page.getByLabel("Language").selectOption("zh-Hans");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByLabel("语言")).toHaveValue("zh-Hans");
  await expect(page.locator(".pane-stats").first()).toContainText("行");
  await expect(page.locator(".status-profile")).toContainText("默认");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /在浏览器中运行的 MediaWiki/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("wikitext-formatter.settings") ?? "null") as { language?: string });
  expect(stored.language).toBe("zh-Hans");
  expect(await page.evaluate(() => localStorage.getItem("wikitext-formatter.locale"))).toBeNull();

  await page.reload();
  await expect(page.getByLabel("语言")).toHaveValue("zh-Hans");
  await page.getByLabel("语言").selectOption("zh-Hant");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.locator(".pane-stats").first()).toContainText("個字元");
  await expect(page.locator(".status-profile")).toContainText("預設");
});

test("keeps an iterative formatting run tied to its submitted source", async ({ page }) => {
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();

  const source = page.locator('[data-testid="source-editor"] .cm-content');
  await source.click();
  await page.keyboard.insertText("stale edit");
  await expect(page.getByText("Output is outdated")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply output" })).toBeDisabled();
  await expect(page.locator('[data-testid="output-editor"] .cm-content')).toContainText("Example article");

  await page.getByRole("button", { name: "Diff" }).click();
  await expect(page.getByTestId("diff-view")).toBeVisible();
  await expect(page.getByText("Previous formatting run")).toBeVisible();

  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText(/Formatted with changes|Already formatted/)).toBeVisible();
  await expect(page.getByText("Output is outdated")).toBeHidden();
  const sourceBeforeApply = await source.innerText();
  await page.getByRole("button", { name: "Apply output" }).click();
  await expect(page.getByText("Formatted output applied")).toBeVisible();
  await expect(source).toBeFocused();
  await page.keyboard.press("Control+z");
  await expect.poll(() => source.innerText()).toBe(sourceBeforeApply);
});

test("traps settings focus and restores it on Escape", async ({ page }) => {
  const settingsButton = page.getByRole("button", { name: "Settings" });
  await settingsButton.click();
  await expect(page.getByRole("button", { name: "Close settings" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Reset settings" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Formatter settings" })).toBeHidden();
  await expect(settingsButton).toBeFocused();
});

test("keeps editors usable in a narrow mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  const sourceBox = await page.getByTestId("source-editor").boundingBox();
  const outputBox = await page.getByTestId("output-editor").boundingBox();
  expect(sourceBox?.height).toBeGreaterThan(250);
  expect(outputBox?.y).toBeGreaterThan(sourceBox?.y ?? 0);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);
});

test("warns for a large document and recovers after Stop", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "Large.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from("plain text\n".repeat(100_001)),
  });
  await expect(page.getByText(/unusually large file/i)).toBeVisible();

  await page.getByRole("button", { name: "Format" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/Formatting was stopped/i)).toBeVisible();

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
});
