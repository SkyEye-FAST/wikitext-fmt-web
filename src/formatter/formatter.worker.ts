/// <reference lib="webworker" />

import type {
  FormatLevel,
  FormatProfile,
  ResolvedFormatOptions,
} from "wikitext-fmt/browser";

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
      defaults: formatter.resolveFormatProfile("default"),
      profiles: Object.fromEntries(
        formatter.formatProfiles.map((profile) => [
          profile,
          formatter.resolveFormatProfile(profile),
        ]),
      ) as Record<FormatProfile, ResolvedFormatOptions>,
      profileOverrides: Object.fromEntries(
        formatter.formatProfiles.map((profile) => [
          profile,
          formatter.getFormatProfileOverrides(profile),
        ]),
      ) as Record<FormatProfile, Readonly<Partial<ResolvedFormatOptions>>>,
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

    const request = event.data;
    const { generation, requestId } = request;
    const startedAt = performance.now();

    try {
      const formatter = await loadFormatter();
      if (request.type === "load-site-profile") {
        const profile =
          "json" in request.input
            ? formatter.normalizeSiteProfile(JSON.parse(request.input.json))
            : await formatter.loadSiteProfile(
                request.input.apiUrl,
                (url, init) =>
                  fetch(url, {
                    ...init,
                    credentials: "omit",
                    redirect: "error",
                  }),
              );
        post({
          type: "site-profile",
          generation,
          requestId,
          profile,
          serialized: formatter.serializeSiteProfile(profile),
          options: formatter.siteProfileFormatOptions(profile),
        });
        return;
      }
      if (request.type === "template-data") {
        const profile = formatter.normalizeSiteProfile(request.profile);
        if (!request.title.trim() || /[{}|\r\n#<>[\]]/u.test(request.title)) {
          throw new Error("Invalid template title");
        }
        let template =
          Object.entries(profile.templates ?? {}).find(
            ([title]) => title === request.title,
          )?.[1] ?? null;
        if (!template && profile.apiUrl && profile.extensions.templateData) {
          const response = await fetch(
            formatter.siteProfileTemplateDataUrl(
              profile.apiUrl,
              [request.title],
              request.language,
            ),
            { credentials: "omit", redirect: "error" },
          );
          if (!response.ok)
            throw new Error(`TemplateData HTTP ${response.status}`);
          const templates = formatter.normalizeTemplateDataResponse(
            await response.json(),
          );
          template =
            Object.entries(templates).find(
              ([title]) => title === request.title,
            )?.[1] ??
            Object.values(templates)[0] ??
            null;
        }
        post({ type: "template-data", generation, requestId, template });
        return;
      }
      const result = formatter.formatWikitextSafeDetailed(
        request.source,
        request.options,
      );
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
