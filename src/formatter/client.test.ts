import { describe, expect, it, vi } from "vitest";

import { createDetailedResult, createMetadata } from "../test/fixtures.js";
import type { WorkerLike } from "./client.js";
import {
  FormatterClient,
  StaleResponseError,
  WorkerStoppedError,
} from "./client.js";
import type { FormatResponse, WorkerRequest } from "./protocol.js";

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: WorkerRequest[] = [];
  terminated = false;
  formatPostError?: Error;

  postMessage(message: WorkerRequest): void {
    if (message.type === "format" && this.formatPostError) {
      throw this.formatPostError;
    }
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(response: FormatResponse): void {
    this.onmessage?.(new MessageEvent("message", { data: response }));
  }
}

function ready(generation: number): FormatResponse {
  return { type: "ready", generation, metadata: createMetadata() };
}

async function postedFormat(worker: FakeWorker) {
  await vi.waitFor(() => {
    expect(worker.messages.some((message) => message.type === "format")).toBe(
      true,
    );
  });
  const message = worker.messages.at(-1);
  if (!message || message.type !== "format")
    throw new Error("Expected a format request.");
  return message;
}

describe("FormatterClient", () => {
  it("ignores stale responses and resolves only the newest request", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    worker.emit(ready(1));
    await client.ready();

    const first = client.format("first", {});
    const firstRejected =
      expect(first).rejects.toBeInstanceOf(StaleResponseError);
    const second = client.format("second", {});
    await firstRejected;

    worker.emit({
      type: "result",
      generation: 1,
      requestId: 1,
      result: createDetailedResult("stale"),
      durationMs: 1,
    });
    worker.emit({
      type: "result",
      generation: 1,
      requestId: 2,
      result: createDetailedResult("fresh"),
      durationMs: 2,
    });

    await expect(second).resolves.toMatchObject({
      result: { formatted: "fresh" },
      durationMs: 2,
    });
  });

  it("terminates and recreates a busy Worker without losing the client", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    workers[0]?.emit(ready(1));
    await client.ready();
    const operation = client.format("busy", {});
    const stopped =
      expect(operation).rejects.toBeInstanceOf(WorkerStoppedError);
    const restarted = client.restart();

    expect(workers[0]?.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    workers[1]?.emit(ready(2));
    await stopped;
    await expect(restarted).resolves.toMatchObject({ version: "0.8.1" });
  });

  it("surfaces unexpected Worker errors", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    const readiness = client.ready();
    worker.onerror?.(
      new ErrorEvent("error", { message: "module load failed" }),
    );
    await expect(readiness).rejects.toThrow("module load failed");
  });

  it("surfaces typed initialization errors", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    const readiness = client.ready();
    worker.emit({
      type: "initialization-error",
      generation: 1,
      message: "dynamic import failed",
    });
    await expect(readiness).rejects.toThrow("dynamic import failed");
  });

  it("rejects a format waiting on the superseded readiness promise", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    const operation = client.format("waiting", {});
    const restarted = client.restart();

    await expect(operation).rejects.toBeInstanceOf(WorkerStoppedError);
    workers[1]?.emit(ready(2));
    await expect(restarted).resolves.toMatchObject({ version: "0.8.1" });
  });

  it("ignores late messages and errors from a superseded Worker generation", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    workers[0]?.emit(ready(1));
    await client.ready();
    const oldOperation = client.format("old", {});
    const oldRejected =
      expect(oldOperation).rejects.toBeInstanceOf(WorkerStoppedError);
    const restarted = client.restart();

    workers[0]?.emit(ready(1));
    workers[0]?.onerror?.(
      new ErrorEvent("error", { message: "late old error" }),
    );
    workers[0]?.emit({
      type: "result",
      generation: 1,
      requestId: 1,
      result: createDetailedResult("old"),
      durationMs: 1,
    });
    workers[1]?.emit(ready(2));
    await oldRejected;
    await restarted;

    const currentOperation = client.format("new", {});
    const currentRequest = await postedFormat(workers[1]!);
    workers[0]?.emit({
      type: "result",
      generation: 1,
      requestId: currentRequest.requestId,
      result: createDetailedResult("late"),
      durationMs: 1,
    });
    workers[1]?.emit({
      type: "result",
      generation: 2,
      requestId: currentRequest.requestId,
      result: createDetailedResult("current"),
      durationMs: 2,
    });
    await expect(currentOperation).resolves.toMatchObject({
      result: { formatted: "current" },
    });
  });

  it("accepts only the first ready response for a generation", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    worker.emit(ready(1));
    worker.emit({
      type: "ready",
      generation: 1,
      metadata: { ...createMetadata(), version: "duplicate" },
    });
    await expect(client.ready()).resolves.toMatchObject({ version: "0.8.1" });
  });

  it("recreates a failed runtime Worker before the next format", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    workers[0]?.emit(ready(1));
    await client.ready();
    workers[0]?.onerror?.(
      new ErrorEvent("error", { message: "runtime failed" }),
    );

    const operation = client.format("recovered", {});
    expect(workers).toHaveLength(2);
    workers[1]?.emit(ready(2));
    const request = await postedFormat(workers[1]!);
    workers[1]?.emit({
      type: "result",
      generation: 2,
      requestId: request.requestId,
      result: createDetailedResult("recovered"),
      durationMs: 3,
    });
    await expect(operation).resolves.toMatchObject({
      result: { formatted: "recovered" },
    });
  });

  it("rejects a synchronous format post failure and recovers on the next request", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    workers[0]?.emit(ready(1));
    await client.ready();
    workers[0]!.formatPostError = new Error("postMessage failed");

    await expect(client.format("failed", {})).rejects.toThrow(
      "postMessage failed",
    );
    expect(workers[0]?.terminated).toBe(true);

    const recovered = client.format("recovered", {});
    workers[1]?.emit(ready(2));
    const request = await postedFormat(workers[1]!);
    workers[1]?.emit({
      type: "result",
      generation: 2,
      requestId: request.requestId,
      result: createDetailedResult("recovered"),
      durationMs: 2,
    });
    await expect(recovered).resolves.toMatchObject({
      result: { formatted: "recovered" },
    });
  });

  it("rejects readiness exactly once when disposed", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    const readiness = client.ready();
    client.dispose();
    client.dispose();

    await expect(readiness).rejects.toBeInstanceOf(WorkerStoppedError);
    expect(worker.terminated).toBe(true);
  });
});
