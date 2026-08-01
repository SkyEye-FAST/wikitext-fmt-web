import type { FormatDetailedResult, FormatFailure } from "wikitext-fmt/browser";
import type { MessageCatalog } from "../i18n/messages.en.js";

export type FormatStatus =
  | { kind: "idle" }
  | { kind: "formatting" }
  | { kind: "changed"; durationMs: number }
  | { kind: "unchanged"; durationMs: number }
  | { kind: "failure"; durationMs: number; failure: FormatFailure }
  | { kind: "error"; message: string };

export interface RuleDiagnosticSummary {
  rule: string;
  severity: "info" | "warning";
  message: string;
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
  return {
    kind: "error",
    message: error instanceof Error ? error.message : "Unexpected formatter error",
  };
}

type TFunction = (key: keyof MessageCatalog, params?: Record<string, string | number>) => string;

export function summarizeRuleDiagnostics(
  result: FormatDetailedResult,
  t: TFunction,
): RuleDiagnosticSummary[] {
  const rows: RuleDiagnosticSummary[] = [];
  const templates = result.templateParameterDiagnostics;
  const tables = result.tableFormatDiagnostics;
  const lists = result.listDiagnostics;

  if (templates.templatesChanged > 0) {
    rows.push({
      rule: "templates",
      severity: "info",
      message: t("summary.templates-changed", { count: templates.templatesChanged }),
    });
  }
  if (templates.templatesSkippedAmbiguous > 0) {
    rows.push({
      rule: "templates",
      severity: "warning",
      message: t("summary.templates-skipped", { count: templates.templatesSkippedAmbiguous }),
    });
  }
  if (tables.tablesChanged > 0) {
    rows.push({
      rule: "tables",
      severity: "info",
      message: t("summary.tables-changed", { count: tables.tablesChanged }),
    });
  }
  if (tables.tablesSkippedAmbiguous > 0) {
    rows.push({
      rule: "tables",
      severity: "warning",
      message: t("summary.tables-skipped", { count: tables.tablesSkippedAmbiguous }),
    });
  }
  if (lists.listLinesChanged > 0) {
    rows.push({
      rule: "lists",
      severity: "info",
      message: t("summary.lists-changed", { count: lists.listLinesChanged }),
    });
  }
  if (result.footerDiagnostics.categoriesMoved > 0) {
    rows.push({
      rule: "categories",
      severity: "info",
      message: t("summary.categories-moved", { count: result.footerDiagnostics.categoriesMoved }),
    });
  }
  if (result.redirectDiagnostics.redirectsFormatted > 0) {
    rows.push({
      rule: "redirects",
      severity: "info",
      message: t("summary.redirects-formatted"),
    });
  }
  if (result.fileLinkDiagnostics.fileLinksFormatted > 0) {
    rows.push({
      rule: "file-links",
      severity: "info",
      message: t("summary.file-links-formatted", { count: result.fileLinkDiagnostics.fileLinksFormatted }),
    });
  }
  if (result.wikilinkDiagnostics.wikilinksFormatted > 0) {
    rows.push({
      rule: "wikilinks",
      severity: "info",
      message: t("summary.wikilinks-formatted", { count: result.wikilinkDiagnostics.wikilinksFormatted }),
    });
  }
  if (result.externalLinkDiagnostics.externalLinksFormatted > 0) {
    rows.push({
      rule: "external-links",
      severity: "info",
      message: t("summary.external-links-formatted", { count: result.externalLinkDiagnostics.externalLinksFormatted }),
    });
  }
  if (result.referenceDiagnostics.referencesFormatted > 0) {
    rows.push({
      rule: "references",
      severity: "info",
      message: t("summary.references-formatted", { count: result.referenceDiagnostics.referencesFormatted }),
    });
  }
  if (
    result.sectionSpacingDiagnostics.sectionSpacingBeforeHeadingsInserted > 0 ||
    result.sectionSpacingDiagnostics.sectionSpacingAfterHeadingsInserted > 0
  ) {
    rows.push({
      rule: "section-spacing",
      severity: "info",
      message: t("summary.section-spacing-normalized"),
    });
  }

  for (const equivalence of result.equivalenceDiagnostics) {
    if (!equivalence.equivalent) {
      rows.push({
        rule: `${equivalence.structure}-equivalence`,
        severity: "warning",
        message: equivalence.reason ?? t("summary.equivalence-failed", { structure: equivalence.structure }),
      });
    }
  }

  return rows;
}
