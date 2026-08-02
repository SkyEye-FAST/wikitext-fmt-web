import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import { createDetailedResult } from "../test/fixtures.js";
import { DiagnosticsPanel } from "./DiagnosticsPanel.js";

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
});
