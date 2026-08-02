import type {
  FormatDetailedResult,
  FormatLevel,
  FormatOptions,
} from "wikitext-fmt/browser";

export type ResolvedBrowserOptions = Required<FormatOptions>;

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
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      typeof (metadata as Record<string, unknown>).version === "string" &&
      Boolean((metadata as Record<string, unknown>).defaults) &&
      typeof (metadata as Record<string, unknown>).defaults === "object" &&
      Boolean((metadata as Record<string, unknown>).ruleLevels) &&
      typeof (metadata as Record<string, unknown>).ruleLevels === "object"
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
