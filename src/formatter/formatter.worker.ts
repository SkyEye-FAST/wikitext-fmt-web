/// <reference lib="webworker" />

import {
  defaultOptions,
  formatWikitextSafeDetailed,
  ruleLevels,
} from "wikitext-fmt/browser";
import type { FormatLevel } from "wikitext-fmt/browser";
import type { FormatResponse, WorkerRequest } from "./protocol.js";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

function post(response: FormatResponse): void {
  workerScope.postMessage(response);
}

function postReady(): void {
  post({
    type: "ready",
    metadata: {
      defaults: { ...defaultOptions },
      ruleLevels: { ...ruleLevels } as Record<string, FormatLevel>,
      version: __WIKITEXT_FMT_VERSION__,
    },
  });
}

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "initialize") {
    postReady();
    return;
  }

  const { requestId, source, options } = event.data;
  const startedAt = performance.now();

  try {
    const result = formatWikitextSafeDetailed(source, options);
    post({
      type: "result",
      requestId,
      result,
      durationMs: performance.now() - startedAt,
    });
  } catch (error) {
    post({
      type: "error",
      requestId,
      message: error instanceof Error ? error.message : "Unknown formatter error",
    });
  }
});

postReady();
