import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { isLanguagePreference } from "../i18n/locales.js";
import {
  type AppSettings,
  createDefaultSettings,
  isThemePreference,
  sanitizeFormatterSettings,
} from "./schema.js";

export const SETTINGS_STORAGE_KEY = "wikitext-formatter.settings";
const STORAGE_VERSION = 3;

interface StoredSettingsV3 {
  version: 3;
  theme: AppSettings["theme"];
  language: AppSettings["language"];
  lineWrapping: boolean;
  formatter: ResolvedBrowserOptions;
}

interface StoredSettingsV2 {
  version: 2;
  theme: AppSettings["theme"];
  language: AppSettings["language"];
  lineWrapping: boolean;
  formatter: ResolvedBrowserOptions;
}

interface StoredSettingsV1 {
  version: 1;
  theme: AppSettings["theme"];
  lineWrapping: boolean;
  formatter: ResolvedBrowserOptions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateV1ToV2(value: StoredSettingsV1): StoredSettingsV2 {
  return {
    version: 2,
    theme: value.theme,
    language: "system",
    lineWrapping: value.lineWrapping,
    formatter: value.formatter,
  };
}

function migrateV2ToV3(value: StoredSettingsV2): StoredSettingsV3 {
  const legacyFormatter: unknown = value.formatter;
  const formatter = isRecord(legacyFormatter)
    ? {
        ...legacyFormatter,
        profile:
          legacyFormatter.profile === "aggressive"
            ? "production"
            : legacyFormatter.profile,
      }
    : legacyFormatter;
  return {
    version: 3,
    theme: value.theme,
    language: value.language,
    lineWrapping: value.lineWrapping,
    formatter: formatter as ResolvedBrowserOptions,
  };
}

function migrateV0ToV2(
  value: Record<string, unknown>,
): StoredSettingsV2 | undefined {
  const settings = value.settings;
  if (!isRecord(settings)) return undefined;
  return {
    version: 2,
    theme:
      typeof value.theme === "string" && isThemePreference(value.theme)
        ? value.theme
        : "system",
    language: "system",
    lineWrapping:
      typeof value.lineWrapping === "boolean" ? value.lineWrapping : true,
    formatter: settings as unknown as ResolvedBrowserOptions,
  };
}

function parseStored(raw: string): StoredSettingsV3 | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;

  // Already version 3.
  if (value.version === 3) {
    return value as unknown as StoredSettingsV3;
  }

  // Version 2 → 3 migration.
  if (value.version === 2) {
    return migrateV2ToV3(value as unknown as StoredSettingsV2);
  }

  // Version 1 → 2 migration.
  if (value.version === 1) {
    return migrateV2ToV3(migrateV1ToV2(value as unknown as StoredSettingsV1));
  }

  // Version 0 → 2 migration (legacy nested settings).
  if (value.version === 0) {
    const v2 = migrateV0ToV2(value);
    return v2 ? migrateV2ToV3(v2) : undefined;
  }

  return undefined;
}

export function loadSettings(
  defaults: ResolvedBrowserOptions,
  storage: Pick<Storage, "getItem"> = localStorage,
): AppSettings {
  const fallback = createDefaultSettings(defaults);
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;

    const stored = parseStored(raw);
    if (!stored) return fallback;

    return {
      theme: isThemePreference(stored.theme) ? stored.theme : fallback.theme,
      language: isLanguagePreference(stored.language)
        ? stored.language
        : fallback.language,
      lineWrapping:
        typeof stored.lineWrapping === "boolean"
          ? stored.lineWrapping
          : fallback.lineWrapping,
      formatter: sanitizeFormatterSettings(stored.formatter, defaults),
    };
  } catch {
    return fallback;
  }
}

/** Read only the persisted language before formatter metadata is available. */
export function loadStoredLanguagePreference(
  storage: Pick<Storage, "getItem"> = localStorage,
): AppSettings["language"] {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return "system";
    const stored = parseStored(raw);
    return stored && isLanguagePreference(stored.language)
      ? stored.language
      : "system";
  } catch {
    return "system";
  }
}

export function saveSettings(
  settings: AppSettings,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  const payload: StoredSettingsV3 = {
    version: STORAGE_VERSION,
    theme: settings.theme,
    language: settings.language,
    lineWrapping: settings.lineWrapping,
    formatter: settings.formatter,
  };
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredSettings(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(SETTINGS_STORAGE_KEY);
}
