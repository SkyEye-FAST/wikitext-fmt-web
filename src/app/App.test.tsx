import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultOptions } from "wikitext-fmt/browser";
import { createDetailedResult, createMetadata } from "../test/fixtures.js";
import App, { type FormatterClientPort } from "./App.js";

describe("App formatting snapshots", () => {
  it("discards a result when the source document changes while formatting", async () => {
    let resolveFormat!: (value: Awaited<ReturnType<FormatterClientPort["format"]>>) => void;
    const pendingFormat = new Promise<Awaited<ReturnType<FormatterClientPort["format"]>>>((resolve) => {
      resolveFormat = resolve;
    });
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi.fn().mockReturnValue(pendingFormat),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(await screen.findByRole("button", { name: "Format" }));
    // Clear is intentionally a no-op at the editor layer. The explicit action
    // must still invalidate the snapshot that is currently being formatted.
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await act(async () => {
      resolveFormat({ result: createDetailedResult("stale output"), durationMs: 1 });
      await pendingFormat;
    });

    expect(screen.getByText(/older result was discarded/i)).toBeVisible();
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent("stale output");
  });
});
