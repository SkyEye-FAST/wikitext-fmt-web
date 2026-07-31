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

export interface FormatOperation {
  result: FormatDetailedResult;
  durationMs: number;
}

interface PendingOperation {
  resolve: (operation: FormatOperation) => void;
  reject: (error: Error) => void;
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
  private worker!: WorkerLike;
  private nextRequestId = 0;
  private latestRequestId = 0;
  private generation = 0;
  private pending = new Map<number, PendingOperation>();
  private readyPromise!: Promise<FormatterMetadata>;
  private resolveReady!: (metadata: FormatterMetadata) => void;
  private rejectReady!: (error: Error) => void;
  private disposed = false;

  constructor(workerFactory: WorkerFactory = defaultWorkerFactory) {
    this.workerFactory = workerFactory;
    this.createWorker();
  }

  ready(): Promise<FormatterMetadata> {
    return this.readyPromise;
  }

  async format(source: string, options: FormatOptions): Promise<FormatOperation> {
    const generation = this.generation;
    await this.ready();
    if (generation !== this.generation) {
      throw new WorkerStoppedError();
    }
    if (this.disposed) {
      throw new WorkerStoppedError("The formatter client has been disposed.");
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

    this.worker.postMessage({
      type: "format",
      requestId,
      source,
      options,
    });

    return operation;
  }

  restart(reason?: string): Promise<FormatterMetadata> {
    this.failPending(new WorkerStoppedError(reason));
    this.worker.terminate();
    this.createWorker();
    return this.ready();
  }

  dispose(): void {
    this.disposed = true;
    this.failPending(new WorkerStoppedError("The formatter client was disposed."));
    this.worker.terminate();
  }

  private createWorker(): void {
    this.generation += 1;
    this.disposed = false;
    this.readyPromise = new Promise<FormatterMetadata>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker = this.workerFactory();
    this.worker.onmessage = (event) => this.handleMessage(event);
    this.worker.onerror = (event) => this.handleWorkerError(event);
    this.worker.postMessage({ type: "initialize" });
  }

  private handleMessage(event: MessageEvent<unknown>): void {
    if (!isFormatResponse(event.data)) {
      this.handleWorkerError(new ErrorEvent("error", { message: "The formatter Worker sent an invalid response." }));
      return;
    }

    const response: FormatResponse = event.data;
    if (response.type === "ready") {
      this.resolveReady(response.metadata);
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
      pending.reject(new Error(response.message));
      return;
    }

    pending.resolve({
      result: response.result,
      durationMs: response.durationMs,
    });
  }

  private handleWorkerError(event: ErrorEvent): void {
    const error = new Error(event.message || "The formatter Worker failed to initialize.");
    this.rejectReady(error);
    this.failPending(error);
  }

  private failPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
