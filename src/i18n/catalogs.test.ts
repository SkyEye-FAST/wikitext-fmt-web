import { describe, expect, it } from "vitest";
import type { MessageCatalog } from "./messages.en.js";
import { enMessages } from "./messages.en.js";
import { messages as zhHansMessages } from "./messages.zh-Hans.js";
import { messages as zhHantMessages } from "./messages.zh-Hant.js";
import { createT } from "./useI18n.js";

function extractPlaceholders(value: string): string[] {
  // Extract parameter names used for interpolation.
  // Simple pattern: {name}
  // ICU plural: {count, plural, one {text} other {text}} → only "count" is a parameter.
  // We don't count literal words inside plural arms.
  const seen = new Set<string>();

  // Match ICU plural patterns and extract the parameter name.
  const icuRe = /\{(\w+)\s*,\s*plural\s*,\s*one\s*\{[^}]*\}\s*other\s*\{[^}]*\}\s*\}/gu;
  for (const m of value.matchAll(icuRe)) {
    if (m[1]) seen.add(m[1]);
  }

  // Remove ICU patterns, then extract remaining simple {name} patterns.
  const stripped = value.replace(icuRe, "");
  const simpleRe = /\{(\w+)\}/gu;
  for (const m of stripped.matchAll(simpleRe)) {
    if (m[1]) seen.add(m[1]);
  }

  return [...seen].sort();
}

const catalogs: [string, MessageCatalog][] = [
  ["zh-Hans", zhHansMessages],
  ["zh-Hant", zhHantMessages],
];

const enKeys = Object.keys(enMessages) as (keyof MessageCatalog)[];

describe("i18n catalog consistency", () => {
  it("has identical key sets across all three catalogs", () => {
    const enKeySet = new Set(enKeys);

    for (const [name, catalog] of catalogs) {
      const targetKeys = Object.keys(catalog) as (keyof MessageCatalog)[];
      const missingInTarget = enKeys.filter((k) => !targetKeys.includes(k));
      const extraInTarget = targetKeys.filter((k) => !enKeySet.has(k));

      expect(
        missingInTarget,
        `${name} missing keys: ${missingInTarget.join(", ")}`,
      ).toEqual([]);
      expect(
        extraInTarget,
        `${name} extra keys: ${extraInTarget.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("has consistent interpolation placeholders across all catalogs", () => {
    for (const [name, catalog] of catalogs) {
      for (const key of enKeys) {
        const enValue = enMessages[key];
        const targetValue = catalog[key];
        if (!targetValue) continue;

        const enPlaceholders = extractPlaceholders(enValue);
        const targetPlaceholders = extractPlaceholders(targetValue);
        expect(
          targetPlaceholders,
          `${name} "${key}" placeholders mismatch: expected ${enPlaceholders.join(", ")}, got ${targetPlaceholders.join(", ")}`,
        ).toEqual(enPlaceholders);
      }
    }
  });

  it("resolves English text for key UI strings", () => {
    const t = createT(enMessages);

    expect(t("brand.name")).toBe("Wikitext Formatter");
    expect(t("toolbar.format")).toBe("Format");
    expect(t("editor.source.label")).toBe("Source");
    expect(t("settings.title")).toBe("Formatter settings");
  });

  it("resolves Simplified Chinese text for key UI strings", () => {
    const t = createT(zhHansMessages);

    // Brand stays English.
    expect(t("brand.name")).toBe("Wikitext Formatter");
    expect(t("toolbar.format")).toBe("格式化");
    expect(t("editor.source.label")).toBe("源文本");
    expect(t("editor.output.label")).toBe("格式化结果");
    expect(t("settings.title")).toBe("格式化器设置");
    expect(t("settings.general")).toBe("常规");
  });

  it("resolves Traditional Chinese text for key UI strings", () => {
    const t = createT(zhHantMessages);

    // Brand stays English.
    expect(t("brand.name")).toBe("Wikitext Formatter");
    expect(t("toolbar.format")).toBe("格式化");
    expect(t("editor.source.label")).toBe("原始碼");
    expect(t("editor.output.label")).toBe("格式化輸出");
    expect(t("settings.title")).toBe("格式化器設定");
    expect(t("settings.general")).toBe("一般");
  });

  it("falls back to English for missing translations", () => {
    // The createT function falls back to enMessages when a key is missing.
    // Since all catalogs have the same keys, we test that the fallback
    // mechanism works by checking that English is used when a key exists in en
    // but the catalog lookup returns undefined.
    const partialCatalog = { ...zhHansMessages };
    // Simulate a missing key by deleting one.
    delete (partialCatalog as Record<string, string>)["toolbar.format"];

    const t = createT(partialCatalog as MessageCatalog);
    // Should fall back to English.
    expect(t("toolbar.format")).toBe("Format");
  });
});

describe("interpolation and plurals", () => {
  it("interpolates named parameters", () => {
    const t = createT(enMessages);
    expect(t("status.versions", { web: "0.1.1", fmt: "0.6.0" })).toBe(
      "Web 0.1.1 · Formatter 0.6.0",
    );
    expect(t("editor.stats.aria", { lines: 10, characters: 200 })).toBe(
      "10 lines, 200 characters",
    );
  });

  it("handles English plural forms correctly", () => {
    const t = createT(enMessages);

    // One entry.
    expect(t("diagnostics.entries", { count: 1 })).toContain("1 rule entry");
    // Multiple entries.
    expect(t("diagnostics.entries", { count: 5 })).toContain("5 rule entries");

    // One template.
    expect(t("summary.templates-changed", { count: 1 })).toBe(
      "Formatted 1 template.",
    );
    // Multiple templates.
    expect(t("summary.templates-changed", { count: 3 })).toBe(
      "Formatted 3 templates.",
    );
  });

  it("returns the key as-is when params are missing for interpolation", () => {
    const t = createT(enMessages);
    // Missing params should still produce sensible output (the placeholder key).
    const result = t("editor.stats.aria");
    expect(result).toContain("{lines}");
    expect(result).toContain("{characters}");
  });
});
