import { describe, expect, it } from "vitest";
import type { MessageCatalog } from "../i18n/messages.en.js";
import { classifyResult, classifyUnexpectedError, summarizeRuleDiagnostics } from "./resultSummary.js";
import { createDetailedResult } from "../test/fixtures.js";

function t(key: keyof MessageCatalog, params?: Record<string, string | number>): string {
  // Return English-like output for testing — the exact messages are tested
  // in the i18n catalog tests.
  if (params?.count !== undefined) {
    return String(params.count);
  }
  return String(key);
}

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
      code: "unknown",
      detail: "Worker crashed",
    });
  });

  it("summarizes rule counters without inventing causes", () => {
    const result = createDetailedResult("formatted");
    result.templateDiagnostics.templatesChanged = 2;
    result.tableFormatDiagnostics.tablesSkippedAmbiguous = 1;
    const rows = summarizeRuleDiagnostics(result, t);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ rule: "templates", severity: "info" });
    expect(rows[1]).toMatchObject({ rule: "tables", severity: "warning" });
  });
});
