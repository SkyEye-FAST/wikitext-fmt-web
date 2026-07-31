import { describe, expect, it } from "vitest";
import { isFormatResponse, type FormatRequest, type FormatResponse } from "./protocol.js";

describe("Worker protocol", () => {
  it("accepts typed monotonically identifiable messages", () => {
    const request: FormatRequest = {
      type: "format",
      requestId: 42,
      source: "==Title==\n",
      options: { profile: "default" },
    };
    const response = {
      type: "error",
      requestId: request.requestId,
      message: "test",
    } satisfies FormatResponse;

    expect(isFormatResponse(response)).toBe(true);
    expect(isFormatResponse({ type: "result", requestId: "42" })).toBe(false);
    expect(isFormatResponse(null)).toBe(false);
  });
});
