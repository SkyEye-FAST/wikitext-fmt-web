import type {
  FormatDetailedResult,
  FormatLevel,
  FormatOptions,
  FormatProfile,
  ResolvedFormatOptions,
  SiteProfile,
  SiteProfileTemplate,
} from "wikitext-fmt/browser";

export type ResolvedBrowserOptions = ResolvedFormatOptions;
export type FormatterProfiles = Record<FormatProfile, ResolvedBrowserOptions>;
export type FormatterProfileOverrides = Record<
  FormatProfile,
  Readonly<Partial<ResolvedBrowserOptions>>
>;

export interface InitializeRequest {
  type: "initialize";
  generation: number;
}

export interface FormatRequest {
  type: "format";
  generation: number;
  requestId: number;
  source: string;
  options: FormatOptions;
}

export type SiteProfileInput = { json: string } | { apiUrl: string };

export interface LoadedSiteProfile {
  profile: SiteProfile;
  serialized: string;
  options: FormatOptions;
}

export interface LoadSiteProfileRequest {
  type: "load-site-profile";
  generation: number;
  requestId: number;
  input: SiteProfileInput;
}

export interface TemplateDataRequest {
  type: "template-data";
  generation: number;
  requestId: number;
  profile: SiteProfile;
  title: string;
  language: "en" | "zh-hans" | "zh-hant";
}

export type WorkerRequest =
  | InitializeRequest
  | FormatRequest
  | LoadSiteProfileRequest
  | TemplateDataRequest;

export interface FormatterMetadata {
  defaults: ResolvedBrowserOptions;
  profiles: FormatterProfiles;
  profileOverrides: FormatterProfileOverrides;
  ruleLevels: Record<string, FormatLevel>;
  version: string;
}

export type FormatResponse =
  | ({
      type: "site-profile";
      generation: number;
      requestId: number;
    } & LoadedSiteProfile)
  | {
      type: "template-data";
      generation: number;
      requestId: number;
      template: SiteProfileTemplate | null;
    }
  | {
      type: "ready";
      generation: number;
      metadata: FormatterMetadata;
    }
  | {
      type: "result";
      generation: number;
      requestId: number;
      result: FormatDetailedResult;
      durationMs: number;
    }
  | {
      type: "initialization-error";
      generation: number;
      message: string;
    }
  | {
      type: "error";
      generation: number;
      requestId: number;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const profileNames = ["default", "production"] as const;
const formatLevels = ["safe", "normal", "experimental"] as const;
const inlineSpacings = ["auto", "compact", "spaced"] as const;
const parameterLayouts = ["compact", "flush", "indented"] as const;
const placements = ["preserve", "footer"] as const;
const tableSeparators = ["auto", "split", "preserve"] as const;
const voidStyles = ["html5", "xhtml", "preserve"] as const;

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): boolean {
  return typeof value === "string" && values.includes(value as T);
}

function isStringArray(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isResolvedBrowserOptions(
  value: unknown,
): value is ResolvedBrowserOptions {
  if (!isRecord(value)) return false;
  return (
    isOneOf(value.profile, profileNames) &&
    typeof value.parserConfig === "string" &&
    typeof value.lineWidth === "number" &&
    typeof value.formatHeadings === "boolean" &&
    typeof value.formatTemplates === "boolean" &&
    isOneOf(value.inlineTemplateSpacing, inlineSpacings) &&
    isOneOf(value.templateParameterLayout, parameterLayouts) &&
    typeof value.formatCategories === "boolean" &&
    typeof value.formatLists === "boolean" &&
    typeof value.formatFileLinks === "boolean" &&
    typeof value.formatWikilinks === "boolean" &&
    typeof value.formatExternalLinks === "boolean" &&
    typeof value.formatReferences === "boolean" &&
    typeof value.formatInterlanguageLinks === "boolean" &&
    isOneOf(value.interlanguagePlacement, placements) &&
    isStringArray(value.interlanguagePrefixes) &&
    typeof value.formatSectionSpacing === "boolean" &&
    typeof value.formatBehaviorSwitches === "boolean" &&
    typeof value.formatRedirects === "boolean" &&
    isOneOf(value.behaviorSwitchPlacement, placements) &&
    isOneOf(value.localizationSource, ["builtin", "siteinfo", "custom"]) &&
    isOneOf(value.localizedSyntaxStyle, ["preserve", "canonical-english"]) &&
    isRecord(value.localizationAliases) &&
    typeof value.formatTables === "boolean" &&
    isOneOf(value.tableCellSeparatorStyle, tableSeparators) &&
    typeof value.normalizeBlankLines === "boolean" &&
    isOneOf(value.level, formatLevels) &&
    isOneOf(value.htmlVoidTagStyle, voidStyles)
  );
}

function isProfileOverrides(
  value: unknown,
): value is FormatterProfileOverrides {
  if (!isRecord(value)) return false;
  if (
    Object.keys(value).length !== profileNames.length ||
    !profileNames.every((profile) => Object.hasOwn(value, profile))
  ) {
    return false;
  }
  return profileNames.every((profile) => {
    const overrides = value[profile];
    return (
      isRecord(overrides) &&
      Object.entries(overrides).every(
        ([key, option]) =>
          Object.hasOwn(emptyResolvedBrowserOptions, key) &&
          isResolvedBrowserOptions({
            ...emptyResolvedBrowserOptions,
            [key]: option,
          }),
      )
    );
  });
}

const emptyResolvedBrowserOptions: ResolvedBrowserOptions = {
  profile: "default",
  parserConfig: "mediawiki",
  lineWidth: 120,
  formatHeadings: true,
  formatTemplates: true,
  inlineTemplateSpacing: "auto",
  templateParameterLayout: "flush",
  formatCategories: true,
  formatLists: true,
  formatFileLinks: true,
  formatWikilinks: true,
  formatExternalLinks: false,
  formatReferences: false,
  formatInterlanguageLinks: false,
  interlanguagePlacement: "preserve",
  interlanguagePrefixes: [],
  formatSectionSpacing: false,
  formatBehaviorSwitches: true,
  formatRedirects: true,
  behaviorSwitchPlacement: "preserve",
  localizationSource: "builtin",
  localizedSyntaxStyle: "preserve",
  localizationAliases: {},
  formatTables: true,
  tableCellSeparatorStyle: "auto",
  normalizeBlankLines: true,
  level: "normal",
  htmlVoidTagStyle: "html5",
};

function isTemplateDiagnostics(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const numericFields = [
    "templatesInspected",
    "templatesEligible",
    "templatesChanged",
    "templatesAlreadyCanonical",
    "templatesSkippedAmbiguous",
    "uniqueTemplatesFormatted",
    "templatesExpandedToMultiline",
    "existingMultilineTemplatesNormalized",
    "templatesSkipped",
    "formattingPassesUsed",
  ];
  return (
    numericFields.every((field) => typeof value[field] === "number") &&
    typeof value.convergenceLimitReached === "boolean" &&
    isRecord(value.skipReasons) &&
    Array.isArray(value.templateSemanticIds) &&
    Array.isArray(value.changedTemplateSemanticIds)
  );
}

function isJson(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every(isJson)) ||
    (isRecord(value) && Object.values(value).every(isJson))
  );
}

function isInterfaceText(value: unknown): boolean {
  return (
    typeof value === "string" ||
    (isRecord(value) &&
      Object.values(value).every((text) => typeof text === "string"))
  );
}

function isTemplate(value: unknown): value is SiteProfileTemplate {
  if (!isRecord(value) || !isJson(value)) return false;
  if (value.description !== undefined && !isInterfaceText(value.description))
    return false;
  if (value.format !== undefined && typeof value.format !== "string")
    return false;
  if (value.paramOrder !== undefined && !isStringArray(value.paramOrder))
    return false;
  return (
    value.params === undefined ||
    (isRecord(value.params) &&
      Object.values(value.params).every((parameter) => {
        if (!isRecord(parameter)) return false;
        return (
          ["label", "description", "default", "example", "autovalue"].every(
            (key) =>
              parameter[key] === undefined || isInterfaceText(parameter[key]),
          ) &&
          ["required", "suggested"].every(
            (key) =>
              parameter[key] === undefined ||
              typeof parameter[key] === "boolean",
          ) &&
          ["aliases", "suggestedvalues"].every(
            (key) =>
              parameter[key] === undefined || isStringArray(parameter[key]),
          ) &&
          (parameter.type === undefined ||
            typeof parameter.type === "string") &&
          (parameter.deprecated === undefined ||
            typeof parameter.deprecated === "boolean" ||
            typeof parameter.deprecated === "string")
        );
      }))
  );
}

function isFormatOptions(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, option]) =>
        Object.hasOwn(emptyResolvedBrowserOptions, key) &&
        isResolvedBrowserOptions({
          ...emptyResolvedBrowserOptions,
          [key]: option,
        }),
    )
  );
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isSiteProfile(value: unknown): value is SiteProfile {
  if (!isRecord(value)) return false;
  const allowed = [
    "schemaVersion",
    "name",
    "apiUrl",
    "articlePath",
    "extensions",
    "formatter",
    "templates",
    "interwiki",
  ];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return false;
  if (
    isRecord(value.formatter) &&
    (Object.hasOwn(value.formatter, "parserConfig") ||
      Object.hasOwn(value.formatter, "site"))
  )
    return false;
  return (
    value.schemaVersion === 1 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    (value.apiUrl === undefined || isHttpUrl(value.apiUrl)) &&
    (value.articlePath === undefined ||
      (isHttpUrl(value.articlePath) &&
        typeof value.articlePath === "string" &&
        value.articlePath.includes("$1"))) &&
    isRecord(value.extensions) &&
    Object.keys(value.extensions).length === 1 &&
    typeof value.extensions.templateData === "boolean" &&
    (value.formatter === undefined || isFormatOptions(value.formatter)) &&
    (value.templates === undefined ||
      (isRecord(value.templates) &&
        Object.entries(value.templates).every(
          ([name, template]) => name.trim().length > 0 && isTemplate(template),
        ))) &&
    (value.interwiki === undefined ||
      (Array.isArray(value.interwiki) &&
        value.interwiki.every(
          (entry) =>
            isRecord(entry) &&
            typeof entry.prefix === "string" &&
            entry.prefix.trim().length > 0 &&
            (entry.language === undefined ||
              typeof entry.language === "string") &&
            (entry.url === undefined || typeof entry.url === "string") &&
            (entry.local === undefined || typeof entry.local === "boolean"),
        )))
  );
}

export function isFormatResponse(value: unknown): value is FormatResponse {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    !Number.isInteger(candidate.generation) ||
    (candidate.generation as number) < 1
  ) {
    return false;
  }

  if (candidate.type === "ready") {
    const metadata = candidate.metadata;
    return (
      Boolean(metadata) &&
      isRecord(metadata) &&
      typeof metadata.version === "string" &&
      isResolvedBrowserOptions(metadata.defaults) &&
      isRecord(metadata.profiles) &&
      Object.keys(metadata.profiles).length === profileNames.length &&
      profileNames.every((profile) =>
        isResolvedBrowserOptions(
          (metadata.profiles as Record<string, unknown> | undefined)?.[profile],
        ),
      ) &&
      isProfileOverrides(metadata.profileOverrides) &&
      isRecord(metadata.ruleLevels) &&
      Object.values(metadata.ruleLevels).every((level) =>
        isOneOf(level, formatLevels),
      )
    );
  }

  if (candidate.type === "result") {
    const result = candidate.result;
    const resultRecord = isRecord(result) ? result : undefined;
    return (
      Number.isInteger(candidate.requestId) &&
      Number.isFinite(candidate.durationMs) &&
      (candidate.durationMs as number) >= 0 &&
      Boolean(resultRecord) &&
      typeof resultRecord?.formatted === "string" &&
      isTemplateDiagnostics(resultRecord.templateDiagnostics) &&
      !("templateParameterDiagnostics" in resultRecord)
    );
  }

  if (candidate.type === "site-profile") {
    return (
      Number.isInteger(candidate.requestId) &&
      isSiteProfile(candidate.profile) &&
      typeof candidate.serialized === "string" &&
      isFormatOptions(candidate.options)
    );
  }
  if (candidate.type === "template-data") {
    return (
      Number.isInteger(candidate.requestId) &&
      (candidate.template === null || isTemplate(candidate.template))
    );
  }

  if (candidate.type === "initialization-error") {
    return typeof candidate.message === "string";
  }

  return (
    candidate.type === "error" &&
    Number.isInteger(candidate.requestId) &&
    typeof candidate.message === "string"
  );
}
