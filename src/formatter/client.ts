import type { FormatDetailedResult, FormatOptions } from "wikitext-fmt/browser";
import {
  isFormatResponse,
  type FormatterMetadata,
  type FormatResponse,
  type WorkerRequest,
} from "./protocol.js";

export interface WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

export type WorkerFactory = () => WorkerLike;

export type ClientErrorCode =
  | "worker-not-ready"
  | "worker-initialization-failed"
  | "worker-invalid-response"
  | "worker-invalid-generation"
  | "client-disposed"
  | "request-rejected"
  | "unknown";

export class FormatterClientError extends Error {
  readonly code: ClientErrorCode;
  readonly cause?: unknown;

  constructor(code: ClientErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "FormatterClientError";
    this.code = code;
    this.cause = cause;
  }
}

export interface FormatOperation {
  result: FormatDetailedResult;
  durationMs: number;
}

interface PendingOperation {
  resolve: (operation: FormatOperation) => void;
  reject: (error: Error) => void;
}

interface WorkerSession {
  generation: number;
  worker: WorkerLike;
  readiness: Promise<FormatterMetadata>;
  resolveReady: (metadata: FormatterMetadata) => void;
  rejectReady: (error: Error) => void;
  state: "pending" | "ready" | "failed";
  error?: Error;
}

export class StaleResponseError extends Error {
  constructor() {
    super("A newer formatting request replaced this request.");
    this.name = "StaleResponseError";
  }
}

export class WorkerStoppedError extends Error {
  constructor(message = "Formatting was stopped. The formatter Worker was restarted.") {
    super(message);
    this.name = "WorkerStoppedError";
  }
}

function defaultWorkerFactory(): WorkerLike {
  return new Worker(new URL("./formatter.worker.ts", import.meta.url), {
    type: "module",
  });
}

export class FormatterClient {
  private readonly workerFactory: WorkerFactory;
  private session!: WorkerSession;
  private nextRequestId = 0;
  private latestRequestId = 0;
  private generation = 0;
  private pending = new Map<number, PendingOperation>();
  private disposed = false;

  constructor(workerFactory: WorkerFactory = defaultWorkerFactory) {
    this.workerFactory = workerFactory;
    this.createWorker();
  }

  ready(): Promise<FormatterMetadata> {
    if (this.disposed) {
      return Promise.reject(new FormatterClientError("client-disposed", "The formatter client has been disposed."));
    }
    return this.session.readiness;
  }

  async format(source: string, options: FormatOptions): Promise<FormatOperation> {
    if (this.disposed) {
      throw new FormatterClientError("client-disposed", "The formatter client has been disposed.");
    }

    let session = this.session;
    if (session.state === "failed") {
      await this.restart(session.error?.message);
      session = this.session;
    }
    await session.readiness;
    if (session !== this.session || session.generation !== this.generation) {
      throw new WorkerStoppedError();
    }
    if (session.state !== "ready") {
      throw session.error ?? new Error("The formatter Worker is not ready.");
    }

    for (const pending of this.pending.values()) {
      pending.reject(new StaleResponseError());
    }
    this.pending.clear();

    const requestId = ++this.nextRequestId;
    this.latestRequestId = requestId;

    const operation = new Promise<FormatOperation>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
    });

    try {
      session.worker.postMessage({
        type: "format",
        generation: session.generation,
        requestId,
        source,
        options,
      });
    } catch (error) {
      this.handleWorkerFailure(
        session,
        error instanceof Error
          ? new FormatterClientError("request-rejected", error.message, error)
          : new FormatterClientError(
            "request-rejected",
            "The formatter Worker rejected the formatting request.",
            error,
          ),
      );
    }

    return operation;
  }

  restart(reason?: string): Promise<FormatterMetadata> {
    if (this.disposed) {
      return Promise.reject(new FormatterClientError("client-disposed", "The formatter client has been disposed."));
    }
    const error = new WorkerStoppedError(reason);
    this.stopSession(this.session, error);
    this.failPending(error);
    this.session.worker.terminate();
    this.disposed = false;
    this.createWorker();
    return this.ready();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const error = new WorkerStoppedError("The formatter client was disposed.");
    this.stopSession(this.session, error);
    this.failPending(error);
    this.session.worker.terminate();
  }

  private createWorker(): void {
    const generation = ++this.generation;
    let resolveReady!: (metadata: FormatterMetadata) => void;
    let rejectReady!: (error: Error) => void;
    const readiness = new Promise<FormatterMetadata>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    // A caller may restart before observing readiness; keep that rejection handled
    // while returning the original rejecting promise to explicit consumers.
    void readiness.catch(() => undefined);
    const worker = this.workerFactory();
    const session: WorkerSession = {
      generation,
      worker,
      readiness,
      resolveReady,
      rejectReady,
      state: "pending",
    };
    this.session = session;
    worker.onmessage = (event) => this.handleMessage(session, event);
    worker.onerror = (event) => this.handleWorkerError(session, event);
    try {
      worker.postMessage({ type: "initialize", generation });
    } catch (error) {
      this.handleWorkerFailure(
        session,
        error instanceof Error
          ? new FormatterClientError("worker-initialization-failed", error.message, error)
          : new FormatterClientError(
            "worker-initialization-failed",
            "The formatter Worker failed to initialize.",
            error,
          ),
      );
    }
  }

  private handleMessage(session: WorkerSession, event: MessageEvent<unknown>): void {
    if (this.disposed || session !== this.session) {
      return;
    }
    if (!isFormatResponse(event.data)) {
      this.handleWorkerFailure(
        session,
        new FormatterClientError(
          "worker-invalid-response",
          "The formatter Worker sent an invalid response.",
        ),
      );
      return;
    }

    const response: FormatResponse = event.data;
    if (response.generation !== session.generation) {
      this.handleWorkerFailure(
        session,
        new FormatterClientError(
          "worker-invalid-generation",
          "The formatter Worker sent a response for an invalid generation.",
        ),
      );
      return;
    }
    if (response.type === "ready") {
      if (session.state === "pending") {
        session.state = "ready";
        session.resolveReady(response.metadata);
      }
      return;
    }
    if (response.type === "initialization-error") {
      this.handleWorkerFailure(
        session,
        new FormatterClientError("worker-initialization-failed", response.message),
      );
      return;
    }

    if (response.requestId !== this.latestRequestId) {
      return;
    }

    const pending = this.pending.get(response.requestId);
    if (!pending) {
      return;
    }
    this.pending.delete(response.requestId);

    if (response.type === "error") {
      pending.reject(new FormatterClientError("unknown", response.message));
      return;
    }

    pending.resolve({
      result: response.result,
      durationMs: response.durationMs,
    });
  }

  private handleWorkerError(session: WorkerSession, event: ErrorEvent): void {
    const error = new FormatterClientError(
      session.state === "pending" ? "worker-initialization-failed" : "unknown",
      event.message || "The formatter Worker failed unexpectedly.",
      event,
    );
    this.handleWorkerFailure(session, error);
  }

  private handleWorkerFailure(session: WorkerSession, error: Error): void {
    if (this.disposed || session !== this.session) {
      return;
    }
    this.stopSession(session, error);
    this.failPending(error);
    session.worker.terminate();
  }

  private stopSession(session: WorkerSession, error: Error): void {
    if (session.state === "failed") return;
    if (session.state === "pending") {
      session.rejectReady(error);
    }
    session.state = "failed";
    session.error = error;
  }

  private failPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
