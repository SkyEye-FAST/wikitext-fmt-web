import { describe, expect, it } from "vitest";

import {
  type FormatRequest,
  type FormatResponse,
  isFormatResponse,
} from "./protocol.js";
import { createMetadata } from "../test/fixtures.js";

describe("Worker protocol", () => {
  it("validates normalized site profile and TemplateData responses", () => {
    const response = {
      type: "site-profile",
      generation: 1,
      requestId: 5,
      profile: {
        schemaVersion: 1,
        name: "Wiki",
        apiUrl: "https://wiki.example/api.php",
        extensions: { templateData: true },
        templates: {
          Info: { params: { name: { aliases: ["n"], label: { en: "Name" } } } },
        },
        interwiki: [{ prefix: "en", language: "English" }],
      },
      serialized: "{}\n",
      options: { lineWidth: 100, localizationAliases: {} },
    };
    expect(isFormatResponse(response)).toBe(true);
    for (const profile of [
      { ...response.profile, schemaVersion: 2 },
      { ...response.profile, extensions: {} },
      { ...response.profile, apiUrl: "javascript:alert(1)" },
      {
        ...response.profile,
        templates: { Info: { params: { name: { aliases: [3] } } } },
      },
    ]) {
      expect(isFormatResponse({ ...response, profile })).toBe(false);
    }
    expect(isFormatResponse({ ...response, serialized: null })).toBe(false);
    expect(
      isFormatResponse({ ...response, options: { lineWidth: "100" } }),
    ).toBe(false);
    const data = {
      type: "template-data",
      generation: 1,
      requestId: 6,
      template: {
        params: { name: { suggestedvalues: ["A"] } },
        paramOrder: ["name"],
      },
    };
    expect(isFormatResponse(data)).toBe(true);
    expect(isFormatResponse({ ...data, template: null })).toBe(true);
    expect(isFormatResponse({ ...data, template: { params: [] } })).toBe(false);
    expect(
      isFormatResponse({
        ...data,
        template: { params: { name: { required: "yes" } } },
      }),
    ).toBe(false);
    expect(isFormatResponse({ ...data, requestId: "6" })).toBe(false);
  });
  it("accepts typed monotonically identifiable messages", () => {
    const request: FormatRequest = {
      type: "format",
      generation: 3,
      requestId: 42,
      source: "==Title==\n",
      options: { profile: "default" },
    };
    const response = {
      type: "error",
      generation: request.generation,
      requestId: request.requestId,
      message: "test",
    } satisfies FormatResponse;

    expect(isFormatResponse(response)).toBe(true);
    expect(
      isFormatResponse({ type: "result", generation: 3, requestId: "42" }),
    ).toBe(false);
    expect(isFormatResponse(null)).toBe(false);
  });

  it("rejects malformed generations and payloads", () => {
    expect(
      isFormatResponse({ type: "ready", generation: 0, metadata: {} }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "ready",
        generation: 1,
        metadata: { version: "0.8.1", defaults: {}, ruleLevels: {} },
      }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "ready",
        generation: 1,
        metadata: createMetadata(),
      }),
    ).toBe(true);
    expect(
      isFormatResponse({
        type: "ready",
        generation: 1,
        metadata: {
          ...createMetadata(),
          profileOverrides: {
            default: {},
            production: { invented: true },
          },
        },
      }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "result",
        generation: 1,
        requestId: 2,
        result: {
          formatted: "text",
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
        },
        durationMs: 1,
      }),
    ).toBe(true);
    expect(
      isFormatResponse({
        type: "result",
        generation: 1,
        requestId: 2,
        result: { formatted: "text" },
        durationMs: 1,
      }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "result",
        generation: 1,
        requestId: 2,
        result: { formatted: "text" },
        durationMs: -1,
      }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "error",
        generation: 1,
        requestId: 2,
        message: 42,
      }),
    ).toBe(false);
    expect(
      isFormatResponse({
        type: "initialization-error",
        generation: 1,
        message: "load failed",
      }),
    ).toBe(true);
  });
});
