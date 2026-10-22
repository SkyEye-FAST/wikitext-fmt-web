import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createDetailedResult } from "../test/fixtures.js";
import { DiagnosticsPanel } from "./DiagnosticsPanel.js";

afterEach(cleanup);

describe("DiagnosticsPanel", () => {
  it("renders structured failures without rewriting core fields", () => {
    const result = createDetailedResult("source");
    result.failure = {
      code: "document-equivalence",
      stage: "document",
      message: "Exact formatter message.",
    };
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "failure", durationMs: 1, failure: result.failure }}
      />,
    );
    expect(screen.getByLabelText("Diagnostic details")).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByText("document-equivalence")).toBeInTheDocument();
    expect(screen.getByText("Stage: document")).toBeInTheDocument();
    expect(screen.getByText("Exact formatter message.")).toBeInTheDocument();
  });

  it("renders warnings separately from failures", () => {
    const result = createDetailedResult("source");
    result.warning = "Core warning";
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "unchanged", durationMs: 1 }}
      />,
    );
    expect(
      screen.getByText("Core warning").closest(".warning-callout"),
    ).toBeInTheDocument();
  });

  it("renders location column header and go-to-line button when row has a line number", () => {
    const result = createDetailedResult("source");
    result.tableFormatDiagnostics.tablesChanged = 1;
    result.tableDiagnostics = [
      {
        line: 42,
        start: 0,
        end: 20,
        changed: true,
        ambiguous: false,
      },
    ];
    const onGoToLine = vi.fn();
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "unchanged", durationMs: 1 }}
        onGoToLine={onGoToLine}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Location" }),
    ).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Go to line 42" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("42");

    btn.click();
    expect(onGoToLine).toHaveBeenCalledWith(42);
  });

  it("calls onGoToLine when clicking the row with a location", () => {
    const result = createDetailedResult("source");
    result.tableFormatDiagnostics.tablesChanged = 1;
    result.tableDiagnostics = [
      {
        line: 15,
        start: 0,
        end: 20,
        changed: true,
        ambiguous: false,
      },
    ];
    const onGoToLine = vi.fn();
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "unchanged", durationMs: 1 }}
        onGoToLine={onGoToLine}
      />,
    );
    const row = screen.getByText("tables").closest("tr");
    expect(row).toHaveClass("has-location");
    row?.click();
    expect(onGoToLine).toHaveBeenCalledWith(15);
  });

  it("renders dash for rows without line numbers and does not call onGoToLine", () => {
    const result = createDetailedResult("source");
    result.templateDiagnostics.templatesChanged = 1;
    const onGoToLine = vi.fn();
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "unchanged", durationMs: 1 }}
        onGoToLine={onGoToLine}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /go to line/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    const row = screen.getByText("templates").closest("tr");
    expect(row).not.toHaveClass("has-location");
    row?.click();
    expect(onGoToLine).not.toHaveBeenCalled();
  });

  it("allows keyboard activation on the go-to button", async () => {
    const user = userEvent.setup();
    const result = createDetailedResult("source");
    result.tableFormatDiagnostics.tablesChanged = 1;
    result.tableDiagnostics = [
      {
        line: 23,
        start: 0,
        end: 20,
        changed: true,
        ambiguous: false,
      },
    ];
    const onGoToLine = vi.fn();
    render(
      <DiagnosticsPanel
        result={result}
        status={{ kind: "unchanged", durationMs: 1 }}
        onGoToLine={onGoToLine}
      />,
    );
    const btn = screen.getByRole("button", { name: "Go to line 23" });
    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onGoToLine).toHaveBeenCalledWith(23);
  });
});
