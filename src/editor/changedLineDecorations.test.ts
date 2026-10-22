import { describe, expect, it } from "vitest";

import {
  computeChangedLines,
  MAX_CHANGED_LINES_THRESHOLD,
} from "./changedLineDecorations.js";

describe("computeChangedLines", () => {
  it("returns empty set when source or output is empty, or both are identical", () => {
    expect(computeChangedLines("", "hello")).toEqual(new Set());
    expect(computeChangedLines("hello", "")).toEqual(new Set());
    expect(computeChangedLines("hello\nworld", "hello\nworld")).toEqual(
      new Set(),
    );
  });

  it("marks modified line", () => {
    const source = "line 1\nline 2\nline 3";
    const output = "line 1\nline 2 modified\nline 3";
    expect(computeChangedLines(source, output)).toEqual(new Set([2]));
  });

  it("marks inserted lines", () => {
    const source = "line 1\nline 4";
    const output = "line 1\nline 2\nline 3\nline 4";
    expect(computeChangedLines(source, output)).toEqual(new Set([2, 3]));
  });

  it("marks boundary line on deletion", () => {
    const source = "line 1\nline 2\nline 3";
    const output = "line 1\nline 3";
    expect(computeChangedLines(source, output)).toEqual(new Set([2]));
  });

  it("handles insertions at start and end of document", () => {
    expect(computeChangedLines("b\nc", "a\nb\nc")).toEqual(new Set([1]));
    expect(computeChangedLines("a\nb", "a\nb\nc")).toEqual(new Set([3]));
  });

  it("skips computation and returns empty set for large documents exceeding threshold", () => {
    expect(MAX_CHANGED_LINES_THRESHOLD).toBe(20000);

    const largeSource = "a\n".repeat(20001);
    const normalOutput = "a\nb\n";
    expect(computeChangedLines(largeSource, normalOutput)).toEqual(new Set());

    const normalSource = "a\nb\n";
    const largeOutput = "a\n".repeat(20001);
    expect(computeChangedLines(normalSource, largeOutput)).toEqual(new Set());

    // Also verify custom maxLines limit
    const twoLineSource = "line 1\nline 2";
    const twoLineOutput = "line 1\nline 2 modified";
    expect(computeChangedLines(twoLineSource, twoLineOutput, 1)).toEqual(
      new Set(),
    );
    expect(computeChangedLines(twoLineSource, twoLineOutput, 2)).toEqual(
      new Set([2]),
    );
  });
});
