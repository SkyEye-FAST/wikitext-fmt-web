import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { isolateHistory } from "@codemirror/commands";
import type { CompletionSource } from "@codemirror/autocomplete";
import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { setChangedLines } from "../editor/changedLineDecorations.js";
import {
  createEditorExtensions,
  createEditorState,
  type EditorExtensionOptions,
} from "../editor/createEditorState.js";
import type { ResolvedTheme } from "../editor/themes.js";
import type { DocumentStatistics } from "../utils/document.js";

export interface EditorPaneHandle {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  goToLine(line: number): void;
}

interface EditorPaneProps {
  id: string;
  label: string;
  initialValue?: string;
  onDocumentChange?: (statistics: DocumentStatistics) => void;
  readOnly?: boolean;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  placeholder?: string;
  changedLines?: Set<number>;
  onFormat?: () => void;
  describedBy?: string;
  interwiki?: string[];
  completionSource?: CompletionSource;
}

/**
 * A bare CodeMirror host. Pane chrome (titles, counts, actions) belongs to the
 * caller so the same editor can sit in different layouts.
 */
const EditorPaneComponent = forwardRef<EditorPaneHandle, EditorPaneProps>(
  function EditorPane(
    {
      id,
      label,
      initialValue = "",
      onDocumentChange,
      readOnly = false,
      lineWrapping,
      theme,
      placeholder,
      changedLines,
      onFormat,
      describedBy,
      interwiki,
      completionSource,
    }: EditorPaneProps,
    forwardedRef,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const initialValueRef = useRef(initialValue);
    const onDocumentChangeRef = useRef(onDocumentChange);
    const onFormatRef = useRef(onFormat);

    useEffect(() => {
      onFormatRef.current = onFormat;
    }, [onFormat]);
    useEffect(() => {
      onDocumentChangeRef.current = onDocumentChange;
    }, [onDocumentChange]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        getValue: () =>
          viewRef.current?.state.doc.toString() ?? initialValueRef.current,
        setValue: (value) => {
          initialValueRef.current = value;
          const view = viewRef.current;
          if (!view) return;
          // Full-string comparison happens only for explicit document replacement,
          // never for ordinary editor updates.
          if (
            view.state.doc.length === value.length &&
            view.state.doc.sliceString(0) === value
          ) {
            return;
          }
          const selection = view.state.selection.main;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
            selection: {
              anchor: Math.min(selection.anchor, value.length),
              head: Math.min(selection.head, value.length),
            },
            // One undo step of its own, even right after typing.
            annotations: isolateHistory.of("full"),
          });
        },
        focus: () => viewRef.current?.focus(),
        goToLine: (line: number) => {
          const view = viewRef.current;
          if (!view) return;
          const doc = view.state.doc;
          const clampedLine = Math.max(1, Math.min(line, doc.lines));
          const lineObj = doc.line(clampedLine);
          view.dispatch({
            selection: { anchor: lineObj.from, head: lineObj.to },
            effects: EditorView.scrollIntoView(lineObj.from, { y: "center" }),
          });
          view.focus();
        },
      }),
      [],
    );

    function extensionOptions(): EditorExtensionOptions {
      return {
        readOnly,
        lineWrapping,
        theme,
        interwiki,
        completionSource,
        enableChangedLines: readOnly,
        placeholder,
        onFormat: onFormat ? () => onFormatRef.current?.() : undefined,
        onDocumentChange: (statistics) =>
          onDocumentChangeRef.current?.(statistics),
      };
    }

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const view = new EditorView({
        state: createEditorState({
          doc: initialValueRef.current,
          ...extensionOptions(),
        }),
        parent: host,
      });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // EditorView lifetime is intentionally tied only to this pane.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: StateEffect.reconfigure.of(
          createEditorExtensions(extensionOptions()),
        ),
      });
      const content = view.contentDOM;
      content.setAttribute("aria-label", label);
      if (readOnly) content.setAttribute("aria-readonly", "true");
      else content.removeAttribute("aria-readonly");
      if (describedBy) content.setAttribute("aria-describedby", describedBy);
      else content.removeAttribute("aria-describedby");
      // extensionOptions() reads exactly these props.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      describedBy,
      label,
      lineWrapping,
      onFormat,
      placeholder,
      readOnly,
      theme,
      interwiki,
      completionSource,
    ]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view || !readOnly) return;
      view.dispatch({
        effects: setChangedLines.of(changedLines ?? new Set()),
      });
    }, [changedLines, readOnly]);

    return (
      <div ref={hostRef} className="editor-host" data-testid={`${id}-editor`} />
    );
  },
);

export const EditorPane = memo(EditorPaneComponent);
