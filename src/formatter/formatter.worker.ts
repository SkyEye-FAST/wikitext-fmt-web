/// <reference lib="webworker" />

import type { FormatLevel } from "wikitext-fmt/browser";

import type { FormatResponse, WorkerRequest } from "./protocol.js";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

function importFormatter() {
  return import("wikitext-fmt/browser");
}

let formatterPromise: ReturnType<typeof importFormatter> | undefined;

function loadFormatter(): ReturnType<typeof importFormatter> {
  formatterPromise ??= importFormatter();
  return formatterPromise;
}

function post(response: FormatResponse): void {
  workerScope.postMessage(response);
}

function postReady(
  generation: number,
  formatter: Awaited<ReturnType<typeof importFormatter>>,
): void {
  post({
    type: "ready",
    generation,
    metadata: {
      defaults: { ...formatter.defaultOptions },
      ruleLevels: { ...formatter.ruleLevels } as Record<string, FormatLevel>,
      version: __WIKITEXT_FMT_VERSION__,
    },
  });
}

workerScope.addEventListener(
  "message",
  async (event: MessageEvent<WorkerRequest>) => {
    if (event.data.type === "initialize") {
      try {
        postReady(event.data.generation, await loadFormatter());
      } catch (error) {
        post({
          type: "initialization-error",
          generation: event.data.generation,
          message:
            error instanceof Error
              ? error.message
              : "The formatter Worker failed to initialize.",
        });
      }
      return;
    }

    const { generation, requestId, source, options } = event.data;
    const startedAt = performance.now();

    try {
      const formatter = await loadFormatter();
      const result = formatter.formatWikitextSafeDetailed(source, options);
      post({
        type: "result",
        generation,
        requestId,
        result,
        durationMs: performance.now() - startedAt,
      });
    } catch (error) {
      post({
        type: "error",
        generation,
        requestId,
        message:
          error instanceof Error ? error.message : "Unknown formatter error",
      });
    }
  },
);
