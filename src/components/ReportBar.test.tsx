import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormatStatus } from "../formatter/resultSummary.js";
import { createDetailedResult } from "../test/fixtures.js";
import { ReportBar } from "./ReportBar.js";

afterEach(cleanup);

const shortcuts = {
  format: "Ctrl+Enter",
  formatAria: "Control+Enter",
  undo: "Ctrl+Z",
  paste: "Ctrl+V",
};

function renderBar(status: FormatStatus, extra = {}) {
  const props = {
    status,
    changedLineCount: 0,
    presetLabel: "Default",
    formatterVersion: "0.10.0",
    webVersion: "0.5.0",
    shortcuts,
    onAdjust: vi.fn(),
    onGoToLine: vi.fn(),
    ...extra,
  };
  const view = render(<ReportBar {...props} />);
  return { ...props, ...view };
}

describe("ReportBar", () => {
  it("summarizes a successful run and keeps the details collapsed", async () => {
    const user = userEvent.setup();
    const props = renderBar(
      { kind: "changed", durationMs: 42 },
      { result: createDetailedResult("x"), changedLineCount: 3 },
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Formatted3 lines changed in 42 ms.",
    );
    const toggle = screen.getByRole("button", { name: "Details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No rule reported a change.")).toBeVisible();
    expect(screen.getByText(/never uploaded/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(props.onAdjust).toHaveBeenCalledOnce();
  });

  it("opens the details by itself when the formatter declines a change", () => {
    const failure = {
      code: "table-equivalence" as const,
      stage: "tables",
      message: "cell count differs",
    };
    renderBar(
      { kind: "failure", durationMs: 5, failure },
      { result: { ...createDetailedResult("same"), failure } },
    );

    expect(screen.getByRole("status")).toHaveTextContent("Left unchanged");
    expect(
      screen.getByRole("button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("Why your text was left unchanged"),
    ).toBeVisible();
    expect(
      screen.getAllByText(/would have changed a table's structure/).length,
    ).toBeGreaterThan(0);
  });

  it("reports a stale result with the reason", () => {
    renderBar({ kind: "outdated", freshness: "options-outdated" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Settings changed after this result was made.",
    );
  });
});
