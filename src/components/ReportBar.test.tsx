import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormatDetailedResult } from "wikitext-fmt/browser";

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
    presetLabel: "Default",
    shortcuts,
    onAdjust: vi.fn(),
    onGoToLine: vi.fn(),
    ...extra,
  };
  const view = render(<ReportBar {...props} />);
  return { ...props, ...view };
}

function resultWithTable(): FormatDetailedResult {
  const result = createDetailedResult("x");
  return {
    ...result,
    tableFormatDiagnostics: {
      ...result.tableFormatDiagnostics,
      tablesChanged: 1,
    },
    tableDiagnostics: [
      { changed: true, ambiguous: false, line: 23 },
    ] as unknown as FormatDetailedResult["tableDiagnostics"],
  };
}

describe("ReportBar", () => {
  it("counts changes by rule and jumps to a line", async () => {
    const user = userEvent.setup();
    const props = renderBar(
      { kind: "changed", durationMs: 42 },
      { result: resultWithTable() },
    );

    expect(screen.getByRole("status")).toHaveTextContent("Formatted42 ms");
    const counts = screen.getByRole("list", { name: "Changes by rule" });
    expect(counts).toHaveTextContent("Tables1");

    await user.click(screen.getByRole("button", { name: /Go to line 23/ }));
    expect(props.onGoToLine).toHaveBeenCalledWith(23);

    await user.click(screen.getByRole("button", { name: "Default preset" }));
    expect(props.onAdjust).toHaveBeenCalledOnce();
  });

  it("shows no counts when nothing changed", () => {
    renderBar(
      { kind: "unchanged", durationMs: 4 },
      { result: createDetailedResult("same") },
    );

    expect(screen.getByRole("status")).toHaveTextContent("No changes");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("names a declined change and keeps the core message in a tooltip", () => {
    const failure = {
      code: "table-equivalence" as const,
      stage: "tables",
      message: "cell count differs",
    };
    renderBar(
      { kind: "failure", durationMs: 5, failure },
      {
        result: {
          ...createDetailedResult("same"),
          failure,
          warning: failure.message,
        },
      },
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /Not formatted.*Would change table structure.*table-equivalence/,
    );
    expect(screen.queryByText("cell count differs")).not.toBeInTheDocument();
    expect(screen.getByText("table-equivalence")).toHaveAttribute(
      "title",
      "Stage: tables\ncell count differs",
    );
  });

  it("reports a stale result with the reason", () => {
    renderBar({ kind: "outdated", freshness: "options-outdated" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Out of dateSettings changed",
    );
  });
});
