import { describe, expect, it } from "vitest";

import { createDetailedResult } from "../test/fixtures.js";
import {
  classifyResult,
  classifyUnexpectedError,
  countRuleChanges,
} from "./resultSummary.js";

describe("formatter result classification", () => {
  it("distinguishes changed and unchanged results", () => {
    expect(classifyResult("old", createDetailedResult("new"), 5)).toEqual({
      kind: "changed",
      durationMs: 5,
    });
    expect(classifyResult("same", createDetailedResult("same"), 3)).toEqual({
      kind: "unchanged",
      durationMs: 3,
    });
  });

  it("prioritizes structured failures over changed text", () => {
    const result = createDetailedResult("retained");
    result.failure = {
      code: "input-parse",
      stage: "input",
      message: "Exact core failure",
    };
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

  it("counts each rule's changes without inventing causes", () => {
    const result = createDetailedResult("formatted");
    result.templateDiagnostics.templatesChanged = 2;
    result.tableFormatDiagnostics.tablesSkippedAmbiguous = 1;
    expect(countRuleChanges(result)).toEqual([
      { rule: "templates", changed: 2, skipped: 0 },
      { rule: "tables", changed: 0, skipped: 1, line: undefined },
    ]);
  });
});
