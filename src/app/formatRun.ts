import type { FormatDetailedResult } from "wikitext-fmt/browser";

/**
 * The immutable provenance for one completed formatter request. CodeMirror
 * remains the live document authority; this is the one submitted snapshot we
 * retain so that output, diagnostics, and Diff describe the same request.
 */
export interface FormatRun {
  sourceSnapshot: string;
  sourceRevision: number;
  formatterRevision: number;
  result: FormatDetailedResult;
  durationMs: number;
}

export type ResultFreshness =
  | "none"
  | "current"
  | "source-outdated"
  | "options-outdated"
  | "outdated";

export function resolveResultFreshness(
  run: FormatRun | undefined,
  sourceRevision: number,
  formatterRevision: number,
): ResultFreshness {
  if (!run) {
    return "none";
  }

  const sourceMatches = run.sourceRevision === sourceRevision;
  const formatterMatches = run.formatterRevision === formatterRevision;
  if (sourceMatches && formatterMatches) {
    return "current";
  }
  if (!sourceMatches && !formatterMatches) {
    return "outdated";
  }
  return sourceMatches ? "options-outdated" : "source-outdated";
}

export function isApplicableFormatRun(
  run: FormatRun | undefined,
  freshness: ResultFreshness,
): run is FormatRun {
  return run !== undefined && freshness === "current" && !run.result.failure;
}
