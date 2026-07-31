import { describe, expect, it } from "vitest";
import { classifyResult, classifyUnexpectedError, summarizeRuleDiagnostics } from "./resultSummary.js";
import { createDetailedResult } from "../test/fixtures.js";

describe("formatter result classification", () => {
  it("distinguishes changed and unchanged results", () => {
    expect(classifyResult("old", createDetailedResult("new"), 5)).toEqual({ kind: "changed", durationMs: 5 });
    expect(classifyResult("same", createDetailedResult("same"), 3)).toEqual({ kind: "unchanged", durationMs: 3 });
  });

  it("prioritizes structured failures over changed text", () => {
    const result = createDetailedResult("retained");
    result.failure = { code: "input-parse", stage: "input", message: "Exact core failure" };
    expect(classifyResult("source", result, 7)).toEqual({
      kind: "failure",
      durationMs: 7,
      failure: result.failure,
    });
  });

  it("classifies unexpected transport or execution errors separately", () => {
    expect(classifyUnexpectedError(new Error("Worker crashed"))).toEqual({
      kind: "error",
      message: "Worker crashed",
    });
  });

  it("summarizes rule counters without inventing causes", () => {
    const result = createDetailedResult("formatted");
    result.templateParameterDiagnostics.templatesChanged = 2;
    result.tableFormatDiagnostics.tablesSkippedAmbiguous = 1;
    expect(summarizeRuleDiagnostics(result)).toEqual([
      { rule: "templates", severity: "info", message: "Formatted 2 templates." },
      { rule: "tables", severity: "warning", message: "Skipped 1 ambiguous table." },
    ]);
  });
});
