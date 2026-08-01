import type { FormatDetailedResult } from "wikitext-fmt/browser";
import type { FormatterMetadata, ResolvedBrowserOptions } from "../formatter/protocol.js";

export function createDetailedResult(formatted: string): FormatDetailedResult {
  return {
    formatted,
    tableDiagnostics: [],
    tableFormatDiagnostics: {
      tablesInspected: 0,
      tablesEligible: 0,
      tablesChanged: 0,
      tablesAlreadyCanonical: 0,
      tablesSkippedAmbiguous: 0,
      formattingPassesUsed: 0,
      convergenceLimitReached: false,
      tableSemanticIds: [],
      changedTableSemanticIds: [],
    },
    footerDiagnostics: {
      behaviorSwitchesMoved: 0,
      behaviorSwitchesFormatted: 0,
      defaultsortMoved: 0,
      categoriesMoved: 0,
      localizedCategoryAliasesCanonicalized: 0,
      localizedDefaultsortAliasesCanonicalized: 0,
      localizedBehaviorSwitchesCanonicalized: 0,
      interlanguageLinksMoved: 0,
      interlanguageLinksFormatted: 0,
    },
    redirectDiagnostics: { redirectsFormatted: 0, localizedRedirectAliasesCanonicalized: 0 },
    fileLinkDiagnostics: {
      fileLinksFormatted: 0,
      localizedFileNamespaceAliasesCanonicalized: 0,
      localizedImageOptionsCanonicalized: 0,
    },
    wikilinkDiagnostics: {
      wikilinksInspected: 0,
      wikilinksEligible: 0,
      wikilinksFormatted: 0,
      underscoresReplaced: 0,
      wikilinksWithFragmentsFormatted: 0,
      wikilinksSkippedUnsafe: 0,
      skipReasons: {},
    },
    externalLinkDiagnostics: { externalLinksFormatted: 0, externalLinksSkippedUnsafe: 0 },
    referenceDiagnostics: {
      referencesFormatted: 0,
      referenceGroupsFormatted: 0,
      referenceLinesSkippedUnsafe: 0,
    },
    listDiagnostics: {
      listLinesInspected: 0,
      listLinesEligible: 0,
      listLinesChanged: 0,
      listLinesAlreadyCanonical: 0,
      listLinesSkipped: 0,
      mixedMarkerLinesChanged: 0,
      commentBearingLinesChanged: 0,
      structuredContentLinesChanged: 0,
      skipReasons: {},
    },
    sectionSpacingDiagnostics: {
      sectionSpacingBeforeHeadingsInserted: 0,
      sectionSpacingAfterHeadingsInserted: 0,
    },
    templateDiagnostics: {
      templatesInspected: 0,
      templatesEligible: 0,
      templatesChanged: 0,
      templatesAlreadyCanonical: 0,
      templatesSkippedAmbiguous: 0,
      uniqueTemplatesFormatted: 0,
      templatesExpandedToMultiline: 0,
      existingMultilineTemplatesNormalized: 0,
      templatesSkipped: 0,
      skipReasons: {},
      formattingPassesUsed: 0,
      convergenceLimitReached: false,
      templateSemanticIds: [],
      changedTemplateSemanticIds: [],
    },
    equivalenceDiagnostics: [],
  };
}

export function createMetadata(defaults = {} as ResolvedBrowserOptions): FormatterMetadata {
  return { defaults, ruleLevels: {}, version: "0.7.0" };
}
