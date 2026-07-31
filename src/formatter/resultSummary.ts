import type { FormatDetailedResult, FormatFailure } from "wikitext-fmt/browser";

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

export function summarizeRuleDiagnostics(result: FormatDetailedResult): RuleDiagnosticSummary[] {
  const rows: RuleDiagnosticSummary[] = [];
  const templates = result.templateParameterDiagnostics;
  const tables = result.tableFormatDiagnostics;
  const lists = result.listDiagnostics;

  if (templates.templatesChanged > 0) {
    rows.push({
      rule: "templates",
      severity: "info",
      message: `Formatted ${templates.templatesChanged} template${templates.templatesChanged === 1 ? "" : "s"}.`,
    });
  }
  if (templates.templatesSkippedAmbiguous > 0) {
    rows.push({
      rule: "templates",
      severity: "warning",
      message: `Skipped ${templates.templatesSkippedAmbiguous} ambiguous template${templates.templatesSkippedAmbiguous === 1 ? "" : "s"}.`,
    });
  }
  if (tables.tablesChanged > 0) {
    rows.push({
      rule: "tables",
      severity: "info",
      message: `Formatted ${tables.tablesChanged} table${tables.tablesChanged === 1 ? "" : "s"}.`,
    });
  }
  if (tables.tablesSkippedAmbiguous > 0) {
    rows.push({
      rule: "tables",
      severity: "warning",
      message: `Skipped ${tables.tablesSkippedAmbiguous} ambiguous table${tables.tablesSkippedAmbiguous === 1 ? "" : "s"}.`,
    });
  }
  if (lists.listLinesChanged > 0) {
    rows.push({
      rule: "lists",
      severity: "info",
      message: `Formatted ${lists.listLinesChanged} list line${lists.listLinesChanged === 1 ? "" : "s"}.`,
    });
  }
  if (result.footerDiagnostics.categoriesMoved > 0) {
    rows.push({
      rule: "categories",
      severity: "info",
      message: `Moved ${result.footerDiagnostics.categoriesMoved} categor${result.footerDiagnostics.categoriesMoved === 1 ? "y" : "ies"}.`,
    });
  }
  if (result.redirectDiagnostics.redirectsFormatted > 0) {
    rows.push({
      rule: "redirects",
      severity: "info",
      message: "Formatted the redirect directive.",
    });
  }
  if (result.fileLinkDiagnostics.fileLinksFormatted > 0) {
    rows.push({
      rule: "file-links",
      severity: "info",
      message: `Formatted ${result.fileLinkDiagnostics.fileLinksFormatted} file link${result.fileLinkDiagnostics.fileLinksFormatted === 1 ? "" : "s"}.`,
    });
  }
  if (result.wikilinkDiagnostics.wikilinksFormatted > 0) {
    rows.push({
      rule: "wikilinks",
      severity: "info",
      message: `Formatted ${result.wikilinkDiagnostics.wikilinksFormatted} wikilink${result.wikilinkDiagnostics.wikilinksFormatted === 1 ? "" : "s"}.`,
    });
  }
  if (result.externalLinkDiagnostics.externalLinksFormatted > 0) {
    rows.push({
      rule: "external-links",
      severity: "info",
      message: `Formatted ${result.externalLinkDiagnostics.externalLinksFormatted} external link${result.externalLinkDiagnostics.externalLinksFormatted === 1 ? "" : "s"}.`,
    });
  }
  if (result.referenceDiagnostics.referencesFormatted > 0) {
    rows.push({
      rule: "references",
      severity: "info",
      message: `Formatted ${result.referenceDiagnostics.referencesFormatted} reference${result.referenceDiagnostics.referencesFormatted === 1 ? "" : "s"}.`,
    });
  }
  if (
    result.sectionSpacingDiagnostics.sectionSpacingBeforeHeadingsInserted > 0 ||
    result.sectionSpacingDiagnostics.sectionSpacingAfterHeadingsInserted > 0
  ) {
    rows.push({
      rule: "section-spacing",
      severity: "info",
      message: "Normalized spacing around section headings.",
    });
  }

  for (const equivalence of result.equivalenceDiagnostics) {
    if (!equivalence.equivalent) {
      rows.push({
        rule: `${equivalence.structure}-equivalence`,
        severity: "warning",
        message: equivalence.reason ?? `${equivalence.structure} equivalence was not demonstrated.`,
      });
    }
  }

  return rows;
}
