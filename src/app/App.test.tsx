import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultOptions } from "wikitext-fmt/browser";
import { createDetailedResult, createMetadata } from "../test/fixtures.js";
import App, { type FormatterClientPort } from "./App.js";

const originalNavigatorLanguages = navigator.languages;
const originalNavigatorLanguage = navigator.language;

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.head.querySelectorAll('meta[name="description"]').forEach((element) => element.remove());
  Object.defineProperty(navigator, "languages", { configurable: true, value: originalNavigatorLanguages });
  Object.defineProperty(navigator, "language", { configurable: true, value: originalNavigatorLanguage });
});

describe("App formatting snapshots", () => {
  it("discards a result when the source document changes while formatting", async () => {
    let resolveFormat!: (value: Awaited<ReturnType<FormatterClientPort["format"]>>) => void;
    const pendingFormat = new Promise<Awaited<ReturnType<FormatterClientPort["format"]>>>((resolve) => {
      resolveFormat = resolve;
    });
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi.fn().mockReturnValue(pendingFormat),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(await screen.findByRole("button", { name: "Format" }));
    // Clear is intentionally a no-op at the editor layer. The explicit action
    // must still invalidate the snapshot that is currently being formatted.
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await act(async () => {
      resolveFormat({ result: createDetailedResult("stale output"), durationMs: 1 });
      await pendingFormat;
    });

    expect(screen.getByText(/older result was discarded/i)).toBeVisible();
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent("stale output");
  });
});

describe("App formatter client lifecycle", () => {
  function createClientFactory(
    format: FormatterClientPort["format"] = vi.fn().mockResolvedValue({
      result: createDetailedResult("formatted output"),
      durationMs: 1,
    }),
  ) {
    const clients: FormatterClientPort[] = [];
    const factory = vi.fn(() => {
      const client: FormatterClientPort = {
        ready: vi.fn().mockResolvedValue(createMetadata({ ...defaultOptions })),
        format,
        restart: vi.fn().mockResolvedValue(createMetadata({ ...defaultOptions })),
        dispose: vi.fn(),
      };
      clients.push(client);
      return client;
    });
    return { clients, factory };
  }

  it("keeps one injected client across initialization and language changes", async () => {
    const { clients, factory } = createClientFactory();
    const user = userEvent.setup();
    const { unmount } = render(<App createFormatterClient={factory} />);

    await screen.findByRole("button", { name: "Format" });
    expect(factory).toHaveBeenCalledTimes(1);
    const client = clients[0];
    expect(client).toBeDefined();

    await user.selectOptions(screen.getByLabelText("Language"), "zh-Hans");
    expect(factory).toHaveBeenCalledTimes(1);
    expect(client?.dispose).not.toHaveBeenCalled();
    expect(client?.restart).not.toHaveBeenCalled();
    expect(document.documentElement.lang).toBe("zh-Hans");

    unmount();
    await act(async () => { await Promise.resolve(); });
    expect(client?.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not cancel a format when the language changes", async () => {
    let resolveFormat!: (value: Awaited<ReturnType<FormatterClientPort["format"]>>) => void;
    const pendingFormat = new Promise<Awaited<ReturnType<FormatterClientPort["format"]>>>((resolve) => {
      resolveFormat = resolve;
    });
    const { clients, factory } = createClientFactory(vi.fn().mockReturnValue(pendingFormat));
    const user = userEvent.setup();
    const { unmount } = render(<App createFormatterClient={factory} />);

    await screen.findByRole("button", { name: "Format" });
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.selectOptions(screen.getByLabelText("Language"), "zh-Hant");

    await act(async () => {
      resolveFormat({ result: createDetailedResult("保留的输出"), durationMs: 1 });
      await pendingFormat;
    });

    expect(screen.getByTestId("output-editor")).toHaveTextContent("保留的输出");
    expect(screen.getByText("已格式化，有變更")).toBeVisible();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(clients[0]?.dispose).not.toHaveBeenCalled();
    expect(clients[0]?.restart).not.toHaveBeenCalled();
    unmount();
  });

  it("does not leak a client under Strict Mode effects", async () => {
    const { clients, factory } = createClientFactory();
    const { unmount } = render(
      <StrictMode>
        <App createFormatterClient={factory} />
      </StrictMode>,
    );

    await screen.findByRole("button", { name: "Format" });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(clients[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(clients[1]?.dispose).not.toHaveBeenCalled();
    unmount();
    await act(async () => { await Promise.resolve(); });
    expect(clients[1]?.dispose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["zh-CN", "zh-Hans", "正在初始化本地格式化器 Worker……"],
    ["zh-TW", "zh-Hant", "正在初始化本機格式化器 Worker……"],
  ])("uses the browser locale during initialization for %s", (browserLanguage, expectedLocale, expectedMessage) => {
    Object.defineProperty(navigator, "languages", { configurable: true, value: [browserLanguage] });
    Object.defineProperty(navigator, "language", { configurable: true, value: browserLanguage });
    const client: FormatterClientPort = {
      ready: vi.fn().mockReturnValue(new Promise(() => undefined)),
      format: vi.fn(),
      restart: vi.fn(),
      dispose: vi.fn(),
    };
    const description = document.createElement("meta");
    description.name = "description";
    document.head.append(description);

    render(<App createFormatterClient={() => client} />);

    expect(document.documentElement.lang).toBe(expectedLocale);
    expect(screen.getByText(expectedMessage)).toBeVisible();
    expect(description.content).toContain("MediaWiki");
  });
});
