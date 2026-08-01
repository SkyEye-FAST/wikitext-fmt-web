// @vitest-environment node
import { formatWikitextSafeDetailed, ruleLevels } from "wikitext-fmt/browser";
import { describe, expect, it } from "vitest";

describe("wikitext-fmt 0.7.0 browser integration", () => {
  it("exposes the canonical diagnostics and rule metadata", () => {
    const result = formatWikitextSafeDetailed("{{foo|a=1}}\n");
    expect(result).toHaveProperty("templateDiagnostics");
    expect(result).not.toHaveProperty("templateParameterDiagnostics");
    expect(ruleLevels).not.toHaveProperty("templateParameters");
  });

  it.each([
    ["heading", "==Title==\n", "== Title ==\n"],
    ["template", "{{foo|a=1|b=2}}\n", "{{foo\n| a = 1\n| b = 2\n}}\n"],
    ["table", "{| class=wikitable\n|a||b\n|}\n", "{| class=wikitable\n| a\n| b\n|}\n"],
    ["list", "*one\n**two\n", "* one\n** two\n"],
  ])("formats %s syntax", (_name, source, expected) => {
    const result = formatWikitextSafeDetailed(source);
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe(expected);
  });

  it.each([
    ["caption", "{|\n|+Caption\n| A\n|}\n", "{|\n|+ Caption\n| A\n|}\n"],
    ["empty caption", "{|\n|+\n| A\n|}\n", "{|\n|+\n| A\n|}\n"],
    [
      "caption, table, and row attributes",
      "{|class=\"wikitable\"\n|-class=\"row\"\n|+style=\"text-align:center\"|Caption\n|A||B\n|}\n",
      "{| class=\"wikitable\"\n|- class=\"row\"\n|+ style=\"text-align:center\" | Caption\n| A\n| B\n|}\n",
    ],
  ])("normalizes %s layout", (_name, source, expected) => {
    const result = formatWikitextSafeDetailed(source);
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe(expected);
    expect(result.formatted).not.toMatch(/[ \t]+$/mu);
    expect(formatWikitextSafeDetailed(result.formatted).formatted).toBe(result.formatted);
  });

  it("keeps inline separators only in preserve mode", () => {
    const source = "{|class=\"wikitable\"\n|-class=\"row\"\n|+Caption\n!A!!B\n|A||B\n|}\n";
    const result = formatWikitextSafeDetailed(source, { tableCellSeparatorStyle: "preserve" });
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe("{| class=\"wikitable\"\n|- class=\"row\"\n|+ Caption\n! A!!B\n| A||B\n|}\n");
    expect(result.formatted).not.toMatch(/[ \t]+$/mu);
  });

  it.each([
    "|+[[Page|Caption]]\n",
    "|+{{Caption|value}}\n",
    "|+<!--keep-->Caption\n",
  ])("preserves structured caption content: %s", (source) => {
    const result = formatWikitextSafeDetailed(source);
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe(source);
    expect(formatWikitextSafeDetailed(result.formatted).formatted).toBe(result.formatted);
  });

  it("leaves canonical input unchanged", () => {
    const result = formatWikitextSafeDetailed("== Title ==\n");
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe("== Title ==\n");
  });

  it("handles CRLF while preserving the line-ending style", () => {
    const result = formatWikitextSafeDetailed("==Title==\r\n");
    expect(result.failure).toBeUndefined();
    expect(result.formatted).toBe("== Title ==\r\n");
  });

  it("returns a structured fail-closed result for unsupported browser parser configuration", () => {
    const result = formatWikitextSafeDetailed("source", { parserConfig: "unsupported" });
    expect(result.formatted).toBe("source");
    expect(result.failure).toMatchObject({ code: "unsupported-parser-config", stage: "parser-config" });
    expect(result.warning).toBe(result.failure?.message);
  });

  it("produces safe idempotent output", () => {
    const first = formatWikitextSafeDetailed("==Title==\n{{foo|a=1|b=2}}\n");
    const second = formatWikitextSafeDetailed(first.formatted);
    expect(first.failure).toBeUndefined();
    expect(second.failure).toBeUndefined();
    expect(second.formatted).toBe(first.formatted);
  });
});
