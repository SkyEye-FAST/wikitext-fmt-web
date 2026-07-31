import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import {
  createDefaultSettings,
  isThemePreference,
  sanitizeFormatterSettings,
  type AppSettings,
} from "./schema.js";

export const SETTINGS_STORAGE_KEY = "wikitext-formatter.settings";
const STORAGE_VERSION = 1;

interface StoredSettings {
  version: number;
  theme: AppSettings["theme"];
  lineWrapping: boolean;
  formatter: ResolvedBrowserOptions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrate(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.version === STORAGE_VERSION) {
    return value;
  }
  if (value.version === 0 && isRecord(value.settings)) {
    return {
      version: STORAGE_VERSION,
      theme: value.theme,
      lineWrapping: value.lineWrapping,
      formatter: value.settings,
    };
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
    if (!raw) {
      return fallback;
    }
    const migrated = migrate(JSON.parse(raw));
    if (!migrated) {
      return fallback;
    }
    return {
      theme: isThemePreference(migrated.theme) ? migrated.theme : fallback.theme,
      lineWrapping:
        typeof migrated.lineWrapping === "boolean" ? migrated.lineWrapping : fallback.lineWrapping,
      formatter: sanitizeFormatterSettings(migrated.formatter, defaults),
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(
  settings: AppSettings,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  const payload: StoredSettings = {
    version: STORAGE_VERSION,
    theme: settings.theme,
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
