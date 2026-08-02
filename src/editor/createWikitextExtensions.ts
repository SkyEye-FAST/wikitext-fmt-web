import type { ConfigData } from "wikiparser-node";
import parserConfig from "wikiparser-node/config/default.json";

import { bracketMatching, mediawikiLanguage } from "@bhsd/codemirror-wikitext";
import type { Extension } from "@codemirror/state";

const bundledParserConfig = parserConfig as unknown as ConfigData;

export function createWikitextExtensions(): Extension[] {
  return [mediawikiLanguage(bundledParserConfig), bracketMatching()];
}
