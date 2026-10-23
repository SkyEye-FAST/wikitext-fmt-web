import { useEffect, useRef } from "react";

import { unifiedMergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { createEditorExtensions } from "../editor/createEditorState.js";
import type { ResolvedTheme } from "../editor/themes.js";

interface DiffViewProps {
  original: string;
  formatted: string;
  theme: ResolvedTheme;
  lineWrapping: boolean;
  label: string;
  interwiki?: string[];
}

/**
 * One unified diff: removed source lines interleaved with added result lines.
 * It fits the output pane at every width, so there is no separate side-by-side
 * mode to keep in sync.
 */
export default function DiffView({
  original,
  formatted,
  theme,
  lineWrapping,
  label,
  interwiki,
}: DiffViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: formatted,
        extensions: [
          ...createEditorExtensions({
            readOnly: true,
            lineWrapping,
            theme,
            interwiki,
          }),
          unifiedMergeView({
            original,
            gutter: true,
            highlightChanges: true,
            syntaxHighlightDeletions: true,
            mergeControls: false,
            collapseUnchanged: { margin: 3, minSize: 6 },
          }),
        ],
      }),
    });
    view.contentDOM.setAttribute("aria-label", label);
    return () => view.destroy();
  }, [formatted, label, lineWrapping, original, theme, interwiki]);

  return <div ref={hostRef} className="editor-host" data-testid="diff-view" />;
}
