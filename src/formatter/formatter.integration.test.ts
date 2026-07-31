// @vitest-environment node
import { formatWikitextSafeDetailed } from "wikitext-fmt/browser";
import { describe, expect, it } from "vitest";

describe("wikitext-fmt 0.6.0 browser integration", () => {
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
