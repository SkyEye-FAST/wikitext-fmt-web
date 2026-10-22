import { act, createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditorPane, type EditorPaneHandle } from "./EditorPane.js";

afterEach(cleanup);

describe("EditorPane", () => {
  it("owns its document and exposes snapshots through a narrow imperative handle", () => {
    const ref = createRef<EditorPaneHandle>();
    const onDocumentChange = vi.fn();
    render(
      <EditorPane
        ref={ref}
        id="source"
        label="Source"
        lineWrapping
        theme="light"
        onDocumentChange={onDocumentChange}
      />,
    );

    act(() => ref.current?.setValue("==Title==\n"));

    expect(ref.current?.getValue()).toBe("==Title==\n");
    expect(onDocumentChange).toHaveBeenCalledWith({ characters: 10, lines: 2 });
    expect(screen.getByLabelText("2 lines, 10 characters")).toBeVisible();

    act(() => ref.current?.focus());
    expect(screen.getByRole("textbox", { name: "Source" })).toHaveFocus();
  });

  it("navigates and focuses the specified line with goToLine", () => {
    const ref = createRef<EditorPaneHandle>();
    render(
      <EditorPane
        ref={ref}
        id="source"
        label="Source"
        lineWrapping
        theme="light"
      />,
    );

    act(() => ref.current?.setValue("Line 1\nLine 2 target\nLine 3\n"));
    act(() => ref.current?.goToLine(2));

    expect(screen.getByRole("textbox", { name: "Source" })).toHaveFocus();
  });

  it("formats on Mod-Enter without inserting a blank line", async () => {
    const ref = createRef<EditorPaneHandle>();
    const onFormat = vi.fn();
    const user = userEvent.setup();
    render(
      <EditorPane
        ref={ref}
        id="source"
        label="Source"
        lineWrapping
        theme="light"
        onFormat={onFormat}
      />,
    );

    act(() => ref.current?.setValue("==Title=="));
    act(() => ref.current?.focus());
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onFormat).toHaveBeenCalledTimes(1);
    expect(ref.current?.getValue()).toBe("==Title==");
  });
});
