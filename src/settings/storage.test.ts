import { defaultOptions } from "wikitext-fmt/browser";
import { describe, expect, it } from "vitest";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { applyCoreProfile, createDefaultSettings, sanitizeFormatterSettings } from "./schema.js";
import { loadSettings, saveSettings, SETTINGS_STORAGE_KEY } from "./storage.js";

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
    const settings = sanitizeFormatterSettings({ lineWidth: -1, level: "wild", formatTables: false }, defaults);
    expect(settings.lineWidth).toBe(defaults.lineWidth);
    expect(settings.level).toBe(defaults.level);
    expect(settings.formatTables).toBe(false);
    expect(settings.parserConfig).toBe("mediawiki");
  });

  it("migrates the version 0 settings property", () => {
    const storage = memoryStorage(JSON.stringify({ version: 0, theme: "dark", lineWrapping: false, settings: { lineWidth: 88 } }));
    expect(loadSettings(defaults, storage)).toMatchObject({ theme: "dark", lineWrapping: false, formatter: { lineWidth: 88 } });
  });

  it("falls back on corrupt persisted data", () => {
    expect(loadSettings(defaults, memoryStorage("not-json"))).toEqual(createDefaultSettings(defaults));
  });

  it("persists only theme and settings, never source or output text", () => {
    const storage = memoryStorage();
    saveSettings(createDefaultSettings(defaults), storage);
    const serialized = storage.entries.get(SETTINGS_STORAGE_KEY) ?? "";
    expect(serialized).toContain('"theme":"system"');
    expect(serialized).not.toContain("source");
    expect(serialized).not.toContain("output");
  });

  it("applies the core 0.6.0 aggressive profile behavior", () => {
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
