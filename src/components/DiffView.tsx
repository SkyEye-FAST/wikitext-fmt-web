import { MergeView, unifiedMergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { createEditorExtensions } from "../editor/createEditorState.js";
import type { ResolvedTheme } from "../editor/themes.js";

interface DiffViewProps {
  original: string;
  formatted: string;
  theme: ResolvedTheme;
  lineWrapping: boolean;
}

function useNarrowDiff(): boolean {
  const [narrow, setNarrow] = useState(() => matchMedia("(max-width: 800px)").matches);
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

export default function DiffView({ original, formatted, theme, lineWrapping }: DiffViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrowDiff();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const extensions = createEditorExtensions({
      readOnly: true,
      lineWrapping,
      theme,
    });

    if (narrow) {
      const view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: formatted,
          extensions: [
            ...extensions,
            unifiedMergeView({
              original,
              gutter: true,
              highlightChanges: true,
              syntaxHighlightDeletions: true,
              collapseUnchanged: { margin: 3, minSize: 6 },
            }),
          ],
        }),
      });
      view.contentDOM.setAttribute("aria-label", "Unified Wikitext diff");
      return () => view.destroy();
    }

    const merge = new MergeView({
      a: { doc: original, extensions },
      b: { doc: formatted, extensions },
      parent: host,
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: { margin: 3, minSize: 6 },
    });
    merge.a.contentDOM.setAttribute("aria-label", "Original Wikitext");
    merge.b.contentDOM.setAttribute("aria-label", "Formatted Wikitext");
    return () => merge.destroy();
  }, [formatted, lineWrapping, narrow, original, theme]);

  return (
    <section className="diff-pane syntax-spine" aria-labelledby="diff-title">
      <header className="pane-header">
        <h2 id="diff-title">Original and formatted diff</h2>
        <span className="pane-muted">{narrow ? "Unified view" : "Side-by-side view"}</span>
      </header>
      <div ref={hostRef} className="diff-host" data-testid="diff-view" />
    </section>
  );
}
