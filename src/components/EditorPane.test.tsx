import { act, createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorPane, type EditorPaneHandle } from "./EditorPane.js";

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
});
