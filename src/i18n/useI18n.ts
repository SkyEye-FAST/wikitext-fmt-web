import { useContext } from "react";

import { I18nContext } from "./I18nContext.js";
import type { SupportedLocale } from "./locales.js";
import { htmlLang } from "./locales.js";
import enMessages from "./messages.en.json";
import type { MessageCatalog } from "./types.js";

export interface I18n {
  /** The currently active locale. */
  locale: SupportedLocale;
  /** Translate a key with optional parameters. Supports ICU-style plural. */
  t: (
    key: keyof MessageCatalog,
    params?: Record<string, string | number>,
  ) => string;
  /** The HTML lang attribute value. */
  htmlLang: string;
}

/** ICU-style plural-aware interpolation regex. */
const INTERPOLATION_RE =
  /\{(\w+)(?:\s*,\s*plural\s*,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\s*)?\}/gu;

/** Lightweight ICU-style plural-aware interpolation. */
function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(
    INTERPOLATION_RE,
    (
      _match,
      key: string,
      one: string | undefined,
      other: string | undefined,
    ) => {
      const value = params[key];
      if (one !== undefined && other !== undefined) {
        // Plural form
        const count = typeof value === "number" ? value : Number(value);
        const form = count === 1 ? one : other;
        return form.replace(/#/gu, String(count));
      }
      return String(value ?? _match);
    },
  );
}

/** Fallback t() function that uses English messages. */
export function createT(messages: MessageCatalog): I18n["t"] {
  return (key, params) => {
    const template = messages[key] ?? enMessages[key] ?? String(key);
    if (!params) return template;
    return interpolate(template, params);
  };
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for when called outside provider (e.g., tests without wrapping).
    const locale: SupportedLocale = "en";
    return {
      locale,
      t: createT(enMessages),
      htmlLang: htmlLang(locale),
    };
  }
  return ctx;
}
