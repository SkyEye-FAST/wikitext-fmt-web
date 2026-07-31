import { describe, expect, it } from "vitest";
import type { WorkerLike } from "./client.js";
import { FormatterClient, StaleResponseError, WorkerStoppedError } from "./client.js";
import type { FormatResponse, WorkerRequest } from "./protocol.js";
import { createDetailedResult, createMetadata } from "../test/fixtures.js";

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: WorkerRequest[] = [];
  terminated = false;

  postMessage(message: WorkerRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(response: FormatResponse): void {
    this.onmessage?.(new MessageEvent("message", { data: response }));
  }
}

describe("FormatterClient", () => {
  it("ignores stale responses and resolves only the newest request", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    worker.emit({ type: "ready", metadata: createMetadata() });
    await client.ready();

    const first = client.format("first", {});
    const firstRejected = expect(first).rejects.toBeInstanceOf(StaleResponseError);
    const second = client.format("second", {});
    await firstRejected;

    worker.emit({ type: "result", requestId: 1, result: createDetailedResult("stale"), durationMs: 1 });
    worker.emit({ type: "result", requestId: 2, result: createDetailedResult("fresh"), durationMs: 2 });

    await expect(second).resolves.toMatchObject({ result: { formatted: "fresh" }, durationMs: 2 });
  });

  it("terminates and recreates a busy Worker without losing the client", async () => {
    const workers: FakeWorker[] = [];
    const client = new FormatterClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    workers[0]?.emit({ type: "ready", metadata: createMetadata() });
    await client.ready();
    const operation = client.format("busy", {});
    const stopped = expect(operation).rejects.toBeInstanceOf(WorkerStoppedError);
    const restarted = client.restart();

    expect(workers[0]?.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    workers[1]?.emit({ type: "ready", metadata: createMetadata() });
    await stopped;
    await expect(restarted).resolves.toMatchObject({ version: "0.6.0" });
  });

  it("surfaces unexpected Worker errors", async () => {
    const worker = new FakeWorker();
    const client = new FormatterClient(() => worker);
    const readiness = client.ready();
    worker.onerror?.(new ErrorEvent("error", { message: "module load failed" }));
    await expect(readiness).rejects.toThrow("module load failed");
  });
});
