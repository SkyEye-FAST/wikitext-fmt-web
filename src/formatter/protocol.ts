import type {
  FormatDetailedResult,
  FormatLevel,
  FormatOptions,
} from "wikitext-fmt/browser";

export type ResolvedBrowserOptions = Required<FormatOptions>;

export interface InitializeRequest {
  type: "initialize";
}

export interface FormatRequest {
  type: "format";
  requestId: number;
  source: string;
  options: FormatOptions;
}

export type WorkerRequest = InitializeRequest | FormatRequest;

export interface FormatterMetadata {
  defaults: ResolvedBrowserOptions;
  ruleLevels: Record<string, FormatLevel>;
  version: string;
}

export type FormatResponse =
  | {
      type: "ready";
      metadata: FormatterMetadata;
    }
  | {
      type: "result";
      requestId: number;
      result: FormatDetailedResult;
      durationMs: number;
    }
  | {
      type: "error";
      requestId: number;
      message: string;
    };

export function isFormatResponse(value: unknown): value is FormatResponse {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const candidate = value as { type?: unknown; requestId?: unknown };
  if (candidate.type === "ready") {
    return "metadata" in candidate;
  }

  if (candidate.type === "result") {
    return typeof candidate.requestId === "number" && "result" in candidate;
  }

  return (
    candidate.type === "error" &&
    typeof candidate.requestId === "number" &&
    "message" in candidate
  );
}
