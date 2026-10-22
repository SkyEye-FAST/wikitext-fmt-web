import type { FormatDetailedResult, FormatFailure } from "wikitext-fmt/browser";

import type { ResultFreshness } from "../app/formatRun.js";
import enMessages from "../i18n/messages.en.json";
import type { MessageCatalog } from "../i18n/types.js";
import type { ClientErrorCode, FormatterClientError } from "./client.js";

export type FormatStatus =
  | { kind: "idle" }
  | { kind: "formatting" }
  | { kind: "changed"; durationMs: number }
  | { kind: "unchanged"; durationMs: number }
  | { kind: "failure"; durationMs: number; failure: FormatFailure }
  | {
      kind: "outdated";
      freshness: Exclude<ResultFreshness, "none" | "current">;
    }
  | { kind: "applied" }
  | {
      kind: "error";
      code: ClientErrorCode;
      detail?: string;
      messageKey?: "status.formatting-stopped";
    };

/** Rules the status bar counts, in the order it lists them. */
export const COUNTED_RULES = [
  "templates",
  "tables",
  "lists",
  "section-spacing",
  "wikilinks",
  "external-links",
  "file-links",
  "references",
  "categories",
  "redirects",
] as const;

export type CountedRule = (typeof COUNTED_RULES)[number];

export interface RuleCount {
  rule: CountedRule;
  changed: number;
  /** Ambiguous constructs the rule left as written. */
  skipped: number;
  /** First line worth jumping to, when the formatter reports one. */
  line?: number;
}

export function classifyResult(
  source: string,
  result: FormatDetailedResult,
  durationMs: number,
): FormatStatus {
  if (result.failure) {
    return { kind: "failure", durationMs, failure: result.failure };
  }
  if (result.formatted === source) {
    return { kind: "unchanged", durationMs };
  }
  return { kind: "changed", durationMs };
}

export function classifyUnexpectedError(error: unknown): FormatStatus {
  const code: ClientErrorCode = isFormatterClientError(error)
    ? error.code
    : "unknown";
  return {
    kind: "error",
    code,
    detail: error instanceof Error ? error.message : String(error),
  };
}

function isFormatterClientError(error: unknown): error is FormatterClientError {
  return (
    error instanceof Error && "code" in error && typeof error.code === "string"
  );
}

const CLIENT_ERROR_MESSAGE_KEYS: Record<ClientErrorCode, keyof MessageCatalog> =
  {
    "worker-not-ready": "error.worker-not-ready",
    "worker-initialization-failed": "error.worker-initialization-failed",
    "worker-invalid-response": "error.worker-invalid-response",
    "worker-invalid-generation": "error.worker-invalid-generation",
    "client-disposed": "error.client-disposed",
    "request-rejected": "error.request-rejected",
    unknown: "error.unknown",
  };

export function clientErrorMessageKey(
  code: ClientErrorCode,
): keyof MessageCatalog {
  return CLIENT_ERROR_MESSAGE_KEYS[code];
}

/** Plain-language explanation for a fail-closed result. */
export function failureMessageKey(
  code: FormatFailure["code"] | string,
): keyof MessageCatalog {
  const key = `failure.${code}`;
  return Object.hasOwn(enMessages, key)
    ? (key as keyof MessageCatalog)
    : "failure.unknown";
}

export function countRuleChanges(result: FormatDetailedResult): RuleCount[] {
  const tables = result.tableFormatDiagnostics;
  const spacing = result.sectionSpacingDiagnostics;
  const tableLine =
    result.tableDiagnostics?.find((table) => table.ambiguous && table.line > 0)
      ?.line ??
    result.tableDiagnostics?.find((table) => table.changed && table.line > 0)
      ?.line;

  const counts: Record<CountedRule, Omit<RuleCount, "rule">> = {
    templates: {
      changed: result.templateDiagnostics.templatesChanged,
      skipped: result.templateDiagnostics.templatesSkippedAmbiguous,
    },
    tables: {
      changed: tables.tablesChanged,
      skipped: tables.tablesSkippedAmbiguous,
      line: tableLine,
    },
    lists: { changed: result.listDiagnostics.listLinesChanged, skipped: 0 },
    "section-spacing": {
      changed:
        spacing.sectionSpacingBeforeHeadingsInserted +
        spacing.sectionSpacingAfterHeadingsInserted,
      skipped: 0,
    },
    wikilinks: {
      changed: result.wikilinkDiagnostics.wikilinksFormatted,
      skipped: 0,
    },
    "external-links": {
      changed: result.externalLinkDiagnostics.externalLinksFormatted,
      skipped: 0,
    },
    "file-links": {
      changed: result.fileLinkDiagnostics.fileLinksFormatted,
      skipped: 0,
    },
    references: {
      changed: result.referenceDiagnostics.referencesFormatted,
      skipped: 0,
    },
    categories: {
      changed: result.footerDiagnostics.categoriesMoved,
      skipped: 0,
    },
    redirects: {
      changed: result.redirectDiagnostics.redirectsFormatted,
      skipped: 0,
    },
  };

  return COUNTED_RULES.map((rule) => ({ rule, ...counts[rule] })).filter(
    (count) => count.changed > 0 || count.skipped > 0,
  );
}
