export type SupportedLocale = "en" | "zh-Hans" | "zh-Hant";

export type LanguagePreference = "system" | SupportedLocale;

const supportedLocales: readonly SupportedLocale[] = ["en", "zh-Hans", "zh-Hant"];

const simplifiedRegions = new Set(["cn", "sg", "my"]);
const traditionalRegions = new Set(["tw", "hk", "mo"]);

function normalizeBrowserTag(tag: string): string {
  // Accept both hyphens and underscores as separators; normalize to hyphen.
  return tag.trim().replace(/_/gu, "-").toLowerCase();
}

function matchBrowserLocale(browserTag: string): SupportedLocale | undefined {
  const normalized = normalizeBrowserTag(browserTag);
  if (!normalized) return undefined;

  const [language, ...subtags] = normalized.split("-");
  if (language === "en") return "en";
  if (language !== "zh") return undefined;

  const script = subtags.find((subtag) => subtag === "hans" || subtag === "hant");
  if (script === "hans") return "zh-Hans";
  if (script === "hant") return "zh-Hant";

  const region = subtags.find((subtag) => /^[a-z]{2}$/u.test(subtag));
  if (region && simplifiedRegions.has(region)) return "zh-Hans";
  if (region && traditionalRegions.has(region)) return "zh-Hant";

  // A bare `zh` has no script information. Simplified Chinese is the
  // conservative default used by browsers that omit the region.
  if (subtags.length === 0) return "zh-Hans";
  return undefined;
}

/** Resolve a browser language tag to a supported locale, defaulting to "en". */
export function resolveBrowserLocale(browserTag: string): SupportedLocale {
  return matchBrowserLocale(browserTag) ?? "en";
}

/** Detect the best locale from navigator.languages / navigator.language. */
export function detectBrowserLocale(navigator: {
  languages?: readonly string[];
  language?: string;
}): SupportedLocale {
  const languages = navigator.languages ?? [];
  if (languages.length > 0) {
    for (const tag of languages) {
      const locale = matchBrowserLocale(tag);
      if (locale) return locale;
    }
    return "en";
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

/** HTML lang attribute value for each locale. */
export function htmlLang(locale: SupportedLocale): string {
  return locale;
}

/** Direction for each locale (all are LTR for the languages in scope). */
export function localeDirection(): "ltr" {
  return "ltr";
}
