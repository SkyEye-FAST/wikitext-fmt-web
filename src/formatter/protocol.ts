import type {
  FormatDetailedResult,
  FormatLevel,
  FormatOptions,
  FormatProfile,
  ResolvedFormatOptions,
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

export type WorkerRequest = InitializeRequest | FormatRequest;

export interface FormatterMetadata {
  defaults: ResolvedBrowserOptions;
  profiles: FormatterProfiles;
  profileOverrides: FormatterProfileOverrides;
  ruleLevels: Record<string, FormatLevel>;
  version: string;
}

export type FormatResponse =
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

function isOneOf<T extends string>(value: unknown, values: readonly T[]): boolean {
  return typeof value === "string" && values.includes(value as T);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isResolvedBrowserOptions(value: unknown): value is ResolvedBrowserOptions {
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

function isProfileOverrides(value: unknown): value is FormatterProfileOverrides {
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
      Object.entries(overrides).every(([key, option]) =>
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

  if (candidate.type === "initialization-error") {
    return typeof candidate.message === "string";
  }

  return (
    candidate.type === "error" &&
    Number.isInteger(candidate.requestId) &&
    typeof candidate.message === "string"
  );
}
