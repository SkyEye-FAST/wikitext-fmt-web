import type {
  FormatterProfileOverrides,
  FormatterProfiles,
  ResolvedBrowserOptions,
} from "../formatter/protocol.js";
import type { LanguagePreference } from "../i18n/locales.js";
import { isLanguagePreference } from "../i18n/locales.js";

export type ThemePreference = "system" | "light" | "dark";

export interface AppSettings {
  theme: ThemePreference;
  language: LanguagePreference;
  lineWrapping: boolean;
  formatter: ResolvedBrowserOptions;
}

const profiles = ["default", "production"] as const;
const levels = ["safe", "normal", "experimental"] as const;
const inlineSpacing = ["auto", "compact", "spaced"] as const;
const parameterLayouts = ["compact", "flush", "indented"] as const;
const tableSeparators = ["auto", "split", "preserve"] as const;
const voidStyles = ["html5", "xhtml", "preserve"] as const;
const placements = ["preserve", "footer"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function sanitizeFormatterSettings(
  value: unknown,
  defaults: ResolvedBrowserOptions,
): ResolvedBrowserOptions {
  const source = isRecord(value) ? value : {};
  const lineWidth =
    typeof source.lineWidth === "number" &&
    Number.isInteger(source.lineWidth) &&
    source.lineWidth >= 20 &&
    source.lineWidth <= 500
      ? source.lineWidth
      : defaults.lineWidth;
  const interlanguagePrefixes =
    Array.isArray(source.interlanguagePrefixes) &&
    source.interlanguagePrefixes.every((item) => typeof item === "string")
      ? [...source.interlanguagePrefixes]
      : [...defaults.interlanguagePrefixes];

  return {
    ...defaults,
    profile: enumValue(source.profile, profiles, defaults.profile),
    parserConfig: defaults.parserConfig,
    lineWidth,
    formatHeadings: booleanValue(
      source.formatHeadings,
      defaults.formatHeadings,
    ),
    formatTemplates: booleanValue(
      source.formatTemplates,
      defaults.formatTemplates,
    ),
    inlineTemplateSpacing: enumValue(
      source.inlineTemplateSpacing,
      inlineSpacing,
      defaults.inlineTemplateSpacing,
    ),
    templateParameterLayout: enumValue(
      source.templateParameterLayout,
      parameterLayouts,
      defaults.templateParameterLayout,
    ),
    formatCategories: booleanValue(
      source.formatCategories,
      defaults.formatCategories,
    ),
    formatLists: booleanValue(source.formatLists, defaults.formatLists),
    formatFileLinks: booleanValue(
      source.formatFileLinks,
      defaults.formatFileLinks,
    ),
    formatWikilinks: booleanValue(
      source.formatWikilinks,
      defaults.formatWikilinks,
    ),
    formatExternalLinks: booleanValue(
      source.formatExternalLinks,
      defaults.formatExternalLinks,
    ),
    formatReferences: booleanValue(
      source.formatReferences,
      defaults.formatReferences,
    ),
    formatInterlanguageLinks: booleanValue(
      source.formatInterlanguageLinks,
      defaults.formatInterlanguageLinks,
    ),
    interlanguagePlacement: enumValue(
      source.interlanguagePlacement,
      placements,
      defaults.interlanguagePlacement,
    ),
    interlanguagePrefixes,
    formatSectionSpacing: booleanValue(
      source.formatSectionSpacing,
      defaults.formatSectionSpacing,
    ),
    formatBehaviorSwitches: booleanValue(
      source.formatBehaviorSwitches,
      defaults.formatBehaviorSwitches,
    ),
    formatRedirects: booleanValue(
      source.formatRedirects,
      defaults.formatRedirects,
    ),
    behaviorSwitchPlacement: enumValue(
      source.behaviorSwitchPlacement,
      placements,
      defaults.behaviorSwitchPlacement,
    ),
    localizationSource: defaults.localizationSource,
    localizedSyntaxStyle: defaults.localizedSyntaxStyle,
    localizationAliases: { ...defaults.localizationAliases },
    formatTables: booleanValue(source.formatTables, defaults.formatTables),
    tableCellSeparatorStyle: enumValue(
      source.tableCellSeparatorStyle,
      tableSeparators,
      defaults.tableCellSeparatorStyle,
    ),
    normalizeBlankLines: booleanValue(
      source.normalizeBlankLines,
      defaults.normalizeBlankLines,
    ),
    level: enumValue(source.level, levels, defaults.level),
    htmlVoidTagStyle: enumValue(
      source.htmlVoidTagStyle,
      voidStyles,
      defaults.htmlVoidTagStyle,
    ),
  };
}

export function createDefaultSettings(
  defaults: ResolvedBrowserOptions,
): AppSettings {
  return {
    theme: "system",
    language: "system",
    lineWrapping: true,
    formatter: sanitizeFormatterSettings(defaults, defaults),
  };
}

export function applyCoreProfile(
  formatter: ResolvedBrowserOptions,
  profile: ResolvedBrowserOptions["profile"],
  resolvedProfiles: FormatterProfiles,
  profileOverrides: FormatterProfileOverrides,
): ResolvedBrowserOptions {
  const controlledKeys = new Set(
    Object.values(profileOverrides).flatMap((overrides) => Object.keys(overrides)),
  );
  const profileFields = Object.fromEntries(
    [...controlledKeys].map((key) => [
      key,
      resolvedProfiles[profile][key as keyof ResolvedBrowserOptions],
    ]),
  ) as Partial<ResolvedBrowserOptions>;
  return { ...formatter, ...profileFields, profile };
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

// Re-export for convenience.
export { isLanguagePreference };
