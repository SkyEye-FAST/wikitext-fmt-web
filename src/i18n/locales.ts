export type SupportedLocale = "en" | "zh-Hans" | "zh-Hant";

export type LanguagePreference = "system" | SupportedLocale;

const LOCALE_STORAGE_KEY = "wikitext-formatter.locale";

const zhHansPatterns = [/^zh-hans$/iu, /^zh-cn$/iu, /^zh-sg$/iu, /^zh-my$/iu];
const zhHantPatterns = [/^zh-hant$/iu, /^zh-tw$/iu, /^zh-hk$/iu, /^zh-mo$/iu];
const supportedLocales: readonly SupportedLocale[] = ["en", "zh-Hans", "zh-Hant"];

function normalizeBrowserTag(tag: string): string {
  // Accept both hyphens and underscores as separators; normalize to hyphen.
  return tag.replace(/_/gu, "-").toLowerCase();
}

/** Resolve a browser language tag to a supported locale, defaulting to "en". */
export function resolveBrowserLocale(browserTag: string): SupportedLocale {
  const normalized = normalizeBrowserTag(browserTag);
  for (const pattern of zhHansPatterns) {
    if (pattern.test(normalized)) return "zh-Hans";
  }
  for (const pattern of zhHantPatterns) {
    if (pattern.test(normalized)) return "zh-Hant";
  }
  return "en";
}

/** Detect the best locale from navigator.languages / navigator.language. */
export function detectBrowserLocale(navigator: {
  languages?: readonly string[];
  language?: string;
}): SupportedLocale {
  const languages = navigator.languages ?? [];
  for (const tag of languages) {
    const locale = resolveBrowserLocale(tag);
    if (locale !== "en") return locale;
  }
  if (navigator.language) {
    return resolveBrowserLocale(navigator.language);
  }
  return "en";
}

/** Map a LanguagePreference to the actually active locale. */
export function resolveLocale(
  preference: LanguagePreference,
  navigator: {
    languages?: readonly string[];
    language?: string;
  },
): SupportedLocale {
  if (preference === "system") return detectBrowserLocale(navigator);
  return preference;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" && supportedLocales.includes(value as SupportedLocale)
  );
}

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "system" || isSupportedLocale(value);
}

/** Save the user's explicit locale choice so the init screen can use it. */
export function saveLocalePreference(preference: LanguagePreference): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, preference);
  } catch {
    // localStorage may be unavailable.
  }
}

/** Load a previously saved locale preference, or "system" for first visit. */
export function loadLocalePreference(): LanguagePreference {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isLanguagePreference(raw)) return raw;
  } catch {
    // localStorage may be unavailable.
  }
  return "system";
}

/** HTML lang attribute value for each locale. */
export function htmlLang(locale: SupportedLocale): string {
  return locale;
}

/** Direction for each locale (all are LTR for the languages in scope). */
export function localeDirection(): "ltr" {
  return "ltr";
}
