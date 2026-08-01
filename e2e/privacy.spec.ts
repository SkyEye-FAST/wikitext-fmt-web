import { expect, test } from "@playwright/test";

test("never transmits, logs, URL-encodes, or persists Wikitext", async ({ page }) => {
  await page.goto(".");
  await expect(page.getByRole("button", { name: "Format" })).toBeVisible();

  const marker = `codex-private-${Date.now()}-9f4e`;
  const observed: string[] = [];
  page.on("request", (request) => {
    observed.push(request.url(), request.postData() ?? "");
  });
  page.on("framenavigated", (frame) => observed.push(frame.url()));
  page.on("console", (message) => observed.push(message.text()));
  page.on("pageerror", (error) => observed.push(error.message, error.stack ?? ""));

  const source = page.locator('[data-testid="source-editor"] .cm-content');
  await source.click();
  await page.keyboard.insertText(`== ${marker}-typed ==\n`);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "Private.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.from(`==${marker}-file==\n`),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Formatted with changes")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const downloadedChunks: Buffer[] = [];
  for await (const chunk of stream) downloadedChunks.push(Buffer.from(chunk));
  expect(Buffer.concat(downloadedChunks).toString("utf8")).toContain(marker);

  await page.locator('[data-testid="source-editor"] .cm-content').click();
  await page.keyboard.insertText(" stale edit");
  await expect(page.getByText("Output is outdated")).toBeVisible();
  await page.getByRole("button", { name: "Diff" }).click();
  await expect(page.getByText("Previous formatting run")).toBeVisible();
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText(/Formatted with changes|Already formatted/)).toBeVisible();
  await page.getByRole("button", { name: "Apply output" }).click();
  await page.keyboard.press("Control+z");

  await fileInput.setInputFiles({
    name: "Malformed.wikitext",
    mimeType: "text/plain",
    buffer: Buffer.concat([Buffer.from([0]), Buffer.from(marker)]),
  });
  await page.getByRole("button", { name: "Format" }).click();
  await expect(page.getByText("Fail-closed")).toBeVisible();

  const storage = await page.evaluate(() =>
    Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
      const key = localStorage.key(index) ?? "";
      return [key, localStorage.getItem(key) ?? ""];
    })),
  );
  expect(Object.keys(storage)).toEqual(["wikitext-formatter.settings"]);
  expect(JSON.stringify(storage)).not.toContain(marker);

  const evidence = observed.join("\n");
  expect(evidence).not.toContain(marker);
  expect(evidence).not.toContain(encodeURIComponent(marker));
});
