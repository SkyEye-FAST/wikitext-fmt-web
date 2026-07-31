import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { memo, useEffect, useRef, useState } from "react";
import { createEditorExtensions, createEditorState } from "../editor/createEditorState.js";
import type { ResolvedTheme } from "../editor/themes.js";
import { getDocumentStatistics } from "../utils/document.js";

interface EditorPaneProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  mutedLabel?: string;
}

export const EditorPane = memo(function EditorPane({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  lineWrapping,
  theme,
  mutedLabel,
}: EditorPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const [stats, setStats] = useState(() => getDocumentStatistics(value));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const state = createEditorState({
      doc: value,
      readOnly,
      lineWrapping,
      theme,
      onChange: (nextValue, nextStatistics) => {
        setStats(nextStatistics);
        onChangeRef.current?.(nextValue);
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
          doc: view.state.doc.toString(),
          readOnly,
          lineWrapping,
          theme,
          onChange: (nextValue, nextStatistics) => {
            setStats(nextStatistics);
            onChangeRef.current?.(nextValue);
          },
        }),
      ),
    });
    view.contentDOM.setAttribute("aria-label", label);
    view.contentDOM.toggleAttribute("aria-readonly", readOnly);
  }, [label, lineWrapping, readOnly, theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) {
      return;
    }
    const selection = view.state.selection.main;
    const anchor = Math.min(selection.anchor, value.length);
    const head = Math.min(selection.head, value.length);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: { anchor, head },
    });
    setStats({ characters: view.state.doc.length, lines: value.length === 0 ? 0 : view.state.doc.lines });
  }, [value]);

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
