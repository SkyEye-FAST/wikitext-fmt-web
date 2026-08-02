import { StrictMode } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultOptions } from "wikitext-fmt/browser";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createDetailedResult, createMetadata } from "../test/fixtures.js";
import App, { type FormatterClientPort } from "./App.js";

const originalNavigatorLanguages = navigator.languages;
const originalNavigatorLanguage = navigator.language;

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.head
    .querySelectorAll('meta[name="description"]')
    .forEach((element) => element.remove());
  Object.defineProperty(navigator, "languages", {
    configurable: true,
    value: originalNavigatorLanguages,
  });
  Object.defineProperty(navigator, "language", {
    configurable: true,
    value: originalNavigatorLanguage,
  });
});

describe("App formatting snapshots", () => {
  it("discards a result when the source document changes while formatting", async () => {
    let resolveFormat!: (
      value: Awaited<ReturnType<FormatterClientPort["format"]>>,
    ) => void;
    const pendingFormat = new Promise<
      Awaited<ReturnType<FormatterClientPort["format"]>>
    >((resolve) => {
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
      resolveFormat({
        result: createDetailedResult("stale output"),
        durationMs: 1,
      });
      await pendingFormat;
    });

    expect(screen.getByText(/result was discarded/i)).toBeVisible();
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent(
      "stale output",
    );
  });

  it("keeps a completed output and marks its source provenance outdated after editing", async () => {
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi
        .fn()
        .mockResolvedValue({
          result: createDetailedResult("==Formatted==\n"),
          durationMs: 1,
        }),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(
      await screen.findByRole("button", { name: "Load example" }),
    );
    await user.click(screen.getByRole("button", { name: "Format" }));
    await screen.findByText("Formatted with changes");
    await user.click(screen.getByRole("textbox", { name: "Source" }));
    await user.keyboard("x");

    expect(screen.getByText("Output is outdated")).toBeVisible();
    expect(
      screen.getByText(/source or formatter settings changed/i),
    ).toBeVisible();
    expect(screen.getByTestId("output-editor")).toHaveTextContent("Formatted");
    expect(screen.getByRole("button", { name: "Apply output" })).toBeDisabled();
  });

  it("marks a completed output outdated only when formatter options change", async () => {
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi
        .fn()
        .mockResolvedValue({
          result: createDetailedResult("formatted output"),
          durationMs: 1,
        }),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(
      await screen.findByRole("button", { name: "Load example" }),
    );
    await user.click(screen.getByRole("button", { name: "Format" }));
    await screen.findByText("Formatted with changes");
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(screen.queryByText("Output is outdated")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Language"), "zh-Hans");
    expect(screen.queryByText("输出已过期")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(await screen.findByLabelText("自动换行"));
    expect(screen.queryByText("输出已过期")).not.toBeInTheDocument();
    const lineWidth = await screen.findByLabelText("行宽");
    await user.clear(lineWidth);
    await user.type(lineWidth, "88");

    expect(screen.getByText("输出已过期")).toBeVisible();
    expect(screen.getByRole("button", { name: "应用输出" })).toBeDisabled();
  });

  it("discards an in-flight result when formatter options change", async () => {
    let resolveFormat!: (
      value: Awaited<ReturnType<FormatterClientPort["format"]>>,
    ) => void;
    const pendingFormat = new Promise<
      Awaited<ReturnType<FormatterClientPort["format"]>>
    >((resolve) => {
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

    await user.click(
      await screen.findByRole("button", { name: "Load example" }),
    );
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const lineWidth = await screen.findByLabelText("Line width");
    await user.clear(lineWidth);
    await user.type(lineWidth, "88");
    await act(async () => {
      resolveFormat({
        result: createDetailedResult("discarded output"),
        durationMs: 1,
      });
      await pendingFormat;
    });

    expect(screen.getByText(/result was discarded/i)).toBeVisible();
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent(
      "discarded output",
    );
  });

  it("applies a current successful output to the source editor", async () => {
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi
        .fn()
        .mockResolvedValue({
          result: createDetailedResult("==Formatted title==\n"),
          durationMs: 1,
        }),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(
      await screen.findByRole("button", { name: "Load example" }),
    );
    await user.click(screen.getByRole("button", { name: "Format" }));
    await screen.findByText("Formatted with changes");
    await user.click(screen.getByRole("button", { name: "Apply output" }));

    expect(screen.getByText("Formatted output applied")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Source" })).toHaveTextContent(
      "Formatted title",
    );
    expect(screen.getByRole("textbox", { name: "Source" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Apply output" })).toBeDisabled();
  });

  it("resets the completed run when the source is cleared or replaced with the example", async () => {
    const metadata = createMetadata({ ...defaultOptions });
    const client: FormatterClientPort = {
      ready: vi.fn().mockResolvedValue(metadata),
      format: vi
        .fn()
        .mockResolvedValue({
          result: createDetailedResult("formatted output"),
          durationMs: 1,
        }),
      restart: vi.fn().mockResolvedValue(metadata),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App createFormatterClient={() => client} />);

    await user.click(
      await screen.findByRole("button", { name: "Load example" }),
    );
    await user.click(screen.getByRole("button", { name: "Format" }));
    await screen.findByText("Formatted with changes");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent(
      "formatted output",
    );
    expect(screen.getByText("Ready")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Format" }));
    await screen.findByText("Formatted with changes");
    await user.click(screen.getByRole("button", { name: "Load example" }));
    expect(screen.getByTestId("output-editor")).not.toHaveTextContent(
      "formatted output",
    );
    expect(screen.getByText("Ready")).toBeVisible();
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
        restart: vi
          .fn()
          .mockResolvedValue(createMetadata({ ...defaultOptions })),
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
    await act(async () => {
      await Promise.resolve();
    });
    expect(client?.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not cancel a format when the language changes", async () => {
    let resolveFormat!: (
      value: Awaited<ReturnType<FormatterClientPort["format"]>>,
    ) => void;
    const pendingFormat = new Promise<
      Awaited<ReturnType<FormatterClientPort["format"]>>
    >((resolve) => {
      resolveFormat = resolve;
    });
    const { clients, factory } = createClientFactory(
      vi.fn().mockReturnValue(pendingFormat),
    );
    const user = userEvent.setup();
    const { unmount } = render(<App createFormatterClient={factory} />);

    await screen.findByRole("button", { name: "Format" });
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.selectOptions(screen.getByLabelText("Language"), "zh-Hant");

    await act(async () => {
      resolveFormat({
        result: createDetailedResult("保留的输出"),
        durationMs: 1,
      });
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
    await act(async () => {
      await Promise.resolve();
    });
    expect(clients[1]?.dispose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["zh-CN", "zh-Hans", "正在初始化本地格式化器 Worker……"],
    ["zh-TW", "zh-Hant", "正在初始化本機格式化器 Worker……"],
  ])(
    "uses the browser locale during initialization for %s",
    (browserLanguage, expectedLocale, expectedMessage) => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: [browserLanguage],
      });
      Object.defineProperty(navigator, "language", {
        configurable: true,
        value: browserLanguage,
      });
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
    },
  );
});
