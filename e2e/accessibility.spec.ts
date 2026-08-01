import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto(".");
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
});

test("has no automated accessibility violations in primary states", async ({ page }) => {
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Diff" }).click();
  await expect(page.getByTestId("diff-view")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Diff" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Formatter settings" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");

  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectNoAxeViolations(page);
});

test("supports keyboard toolbar use and announces status", async ({ page }) => {
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Format" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Formatted with changes");

  await page.getByRole("button", { name: "Format" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Copy output" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Download" })).toBeFocused();
});

test("keeps controls available at mobile size and 200 percent zoom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(page.getByLabel("Theme")).toBeVisible();
  await expectNoAxeViolations(page);
  const formatBox = await page.getByRole("button", { name: "Format" }).boundingBox();
  expect(formatBox?.height).toBeGreaterThanOrEqual(36);

  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("button", { name: "Close settings" })).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
