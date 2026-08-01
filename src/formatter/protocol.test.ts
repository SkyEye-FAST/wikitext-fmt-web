import { describe, expect, it } from "vitest";
import { isFormatResponse, type FormatRequest, type FormatResponse } from "./protocol.js";

describe("Worker protocol", () => {
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
    expect(isFormatResponse({ type: "result", generation: 3, requestId: "42" })).toBe(false);
    expect(isFormatResponse(null)).toBe(false);
  });

  it("rejects malformed generations and payloads", () => {
    expect(isFormatResponse({ type: "ready", generation: 0, metadata: {} })).toBe(false);
    expect(isFormatResponse({ type: "ready", generation: 1, metadata: { version: "0.6.0", defaults: {}, ruleLevels: {} } })).toBe(true);
    expect(isFormatResponse({ type: "result", generation: 1, requestId: 2, result: { formatted: "text" } })).toBe(false);
    expect(isFormatResponse({ type: "result", generation: 1, requestId: 2, result: { formatted: "text" }, durationMs: -1 })).toBe(false);
    expect(isFormatResponse({ type: "error", generation: 1, requestId: 2, message: 42 })).toBe(false);
    expect(isFormatResponse({ type: "initialization-error", generation: 1, message: "load failed" })).toBe(true);
  });
});
