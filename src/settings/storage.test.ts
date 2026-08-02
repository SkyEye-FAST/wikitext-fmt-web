import { describe, expect, it } from "vitest";
import { defaultOptions } from "wikitext-fmt/browser";

import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import {
  applyCoreProfile,
  createDefaultSettings,
  sanitizeFormatterSettings,
} from "./schema.js";
import {
  loadSettings,
  loadStoredLanguagePreference,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from "./storage.js";

const defaults = { ...defaultOptions } as ResolvedBrowserOptions;

function memoryStorage(initial?: string) {
  const entries = new Map<string, string>();
  if (initial !== undefined) entries.set(SETTINGS_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    entries,
  };
}

describe("settings storage", () => {
  it("validates invalid and obsolete values against current core defaults", () => {
    const settings = sanitizeFormatterSettings(
      { lineWidth: -1, level: "wild", formatTables: false },
      defaults,
    );
    expect(settings.lineWidth).toBe(defaults.lineWidth);
    expect(settings.level).toBe(defaults.level);
    expect(settings.formatTables).toBe(false);
    expect(settings.parserConfig).toBe("mediawiki");
  });

  it("migrates the version 0 settings property to v2", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 0,
        theme: "dark",
        lineWrapping: false,
        settings: { lineWidth: 88 },
      }),
    );
    expect(loadSettings(defaults, storage)).toMatchObject({
      theme: "dark",
      language: "system",
      lineWrapping: false,
      formatter: { lineWidth: 88 },
    });
  });

  it("migrates version 1 settings to v2 with system language default", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 1,
        theme: "light",
        lineWrapping: true,
        formatter: { lineWidth: 100 },
      }),
    );
    const loaded = loadSettings(defaults, storage);
    expect(loaded).toMatchObject({
      theme: "light",
      language: "system",
      lineWrapping: true,
      formatter: { lineWidth: 100 },
    });
  });

  it("retains an explicitly saved language preference in v2", () => {
    const storage = memoryStorage();
    const settings = {
      ...createDefaultSettings(defaults),
      language: "zh-Hans" as const,
    };
    saveSettings(settings, storage);
    const loaded = loadSettings(defaults, storage);
    expect(loaded.language).toBe("zh-Hans");
  });

  it("loads bootstrap language from the settings record only", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "zh-Hant",
        lineWrapping: false,
        formatter: defaults,
      }),
    );
    expect(loadStoredLanguagePreference(storage)).toBe("zh-Hant");
    expect(storage.entries.has("wikitext-formatter.locale")).toBe(false);
  });

  it("uses system for an invalid bootstrap language", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "klingon",
        lineWrapping: false,
        formatter: defaults,
      }),
    );
    expect(loadStoredLanguagePreference(storage)).toBe("system");
  });

  it("falls back to system on an invalid language value in v2", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "klingon",
        lineWrapping: true,
        formatter: defaults,
      }),
    );
    const loaded = loadSettings(defaults, storage);
    expect(loaded.language).toBe("system");
  });

  it("falls back on corrupt persisted data", () => {
    expect(loadSettings(defaults, memoryStorage("not-json"))).toEqual(
      createDefaultSettings(defaults),
    );
  });

  it("drops the removed template-parameter setting from version-2 records without resetting supported settings", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "zh-Hans",
        lineWrapping: false,
        formatter: {
          ...defaults,
          lineWidth: 144,
          formatTemplates: false,
          formatTables: false,
          formatTemplateParameters: true,
        },
      }),
    );

    const loaded = loadSettings(defaults, storage);
    expect(loaded).toMatchObject({
      theme: "dark",
      language: "zh-Hans",
      lineWrapping: false,
      formatter: {
        lineWidth: 144,
        formatTemplates: false,
        formatTables: false,
      },
    });
    expect("formatTemplateParameters" in loaded.formatter).toBe(false);

    saveSettings(loaded, storage);
    const saved = JSON.parse(storage.entries.get(SETTINGS_STORAGE_KEY) ?? "{}");
    expect(saved.formatter).not.toHaveProperty("formatTemplateParameters");
    expect(saved).not.toHaveProperty("source");
    expect(saved).not.toHaveProperty("output");
  });

  it("persists only theme, language, and settings, never source or output text", () => {
    const storage = memoryStorage();
    saveSettings(createDefaultSettings(defaults), storage);
    const serialized = storage.entries.get(SETTINGS_STORAGE_KEY) ?? "";
    expect(serialized).toContain('"theme":"system"');
    expect(serialized).toContain('"language":"system"');
    expect(serialized).not.toContain("source");
    expect(serialized).not.toContain("output");
  });

  it("applies the core aggressive profile behavior", () => {
    const aggressive = applyCoreProfile(defaults, "aggressive");
    expect(aggressive).toMatchObject({
      profile: "aggressive",
      level: "experimental",
      formatReferences: true,
      formatExternalLinks: true,
      formatSectionSpacing: true,
    });
  });
});
