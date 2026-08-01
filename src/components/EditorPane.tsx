import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createEditorExtensions, createEditorState } from "../editor/createEditorState.js";
import type { ResolvedTheme } from "../editor/themes.js";
import { getDocumentStatistics, type DocumentStatistics } from "../utils/document.js";

export interface EditorPaneHandle {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
}

interface EditorPaneProps {
  id: string;
  label: string;
  initialValue?: string;
  onDocumentChange?: (statistics: DocumentStatistics) => void;
  readOnly?: boolean;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  mutedLabel?: string;
}

const EditorPaneComponent = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane({
  id,
  label,
  initialValue = "",
  onDocumentChange,
  readOnly = false,
  lineWrapping,
  theme,
  mutedLabel,
}: EditorPaneProps, forwardedRef) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(initialValue);
  const onDocumentChangeRef = useRef(onDocumentChange);
  const [stats, setStats] = useState(() => getDocumentStatistics(initialValue));

  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  useImperativeHandle(forwardedRef, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? initialValueRef.current,
    setValue: (value) => {
      initialValueRef.current = value;
      const view = viewRef.current;
      if (!view) {
        setStats(getDocumentStatistics(value));
        return;
      }
      // Full-string comparison happens only for explicit document replacement,
      // never for ordinary editor updates.
      if (view.state.doc.length === value.length && view.state.doc.sliceString(0) === value) {
        return;
      }
      const selection = view.state.selection.main;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: {
          anchor: Math.min(selection.anchor, value.length),
          head: Math.min(selection.head, value.length),
        },
      });
    },
    focus: () => viewRef.current?.focus(),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const state = createEditorState({
      doc: initialValueRef.current,
      readOnly,
      lineWrapping,
      theme,
      onDocumentChange: (nextStatistics) => {
        setStats(nextStatistics);
        onDocumentChangeRef.current?.(nextStatistics);
      },
    });
    const view = new EditorView({ state, parent: host });
    view.contentDOM.setAttribute("aria-label", label);
    if (readOnly) {
      view.contentDOM.setAttribute("aria-readonly", "true");
    }
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
    if (!view) {
      return;
    }
    view.dispatch({
      effects: StateEffect.reconfigure.of(
        createEditorExtensions({
          readOnly,
          lineWrapping,
          theme,
          onDocumentChange: (nextStatistics) => {
            setStats(nextStatistics);
            onDocumentChangeRef.current?.(nextStatistics);
          },
        }),
      ),
    });
    view.contentDOM.setAttribute("aria-label", label);
    view.contentDOM.toggleAttribute("aria-readonly", readOnly);
  }, [label, lineWrapping, readOnly, theme]);

  return (
    <section className="editor-pane syntax-spine" aria-labelledby={`${id}-label`}>
      <header className="pane-header">
        <div>
          <h2 id={`${id}-label`}>{label}</h2>
          {mutedLabel ? <span className="pane-muted">{mutedLabel}</span> : null}
        </div>
        <span className="pane-stats" aria-label={`${stats.lines} lines, ${stats.characters} characters`}>
          {stats.lines.toLocaleString()} lines · {stats.characters.toLocaleString()} chars
        </span>
      </header>
      <div ref={hostRef} className="editor-host" data-testid={`${id}-editor`} />
    </section>
  );
});

export const EditorPane = memo(EditorPaneComponent);
