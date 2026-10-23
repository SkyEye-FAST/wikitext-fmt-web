import { RangeSetBuilder } from "@codemirror/state";
import type { EditorState, Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

export const CURRENT_LINE_LIGATURES_CLASS = "cm-current-line-ligatures-off";

const currentLineLigatureDecoration = Decoration.line({
  class: CURRENT_LINE_LIGATURES_CLASS,
});

export function buildCurrentLineDecorations(state: EditorState): DecorationSet {
  const lineNumbers = new Set<number>();

  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let l = fromLine; l <= toLine; l++) {
      lineNumbers.add(l);
    }
  }

  if (lineNumbers.size === 0) {
    return Decoration.none;
  }

  const sortedLines = Array.from(lineNumbers).sort((a, b) => a - b);
  const builder = new RangeSetBuilder<Decoration>();
  for (const lineNo of sortedLines) {
    const line = state.doc.line(lineNo);
    builder.add(line.from, line.from, currentLineLigatureDecoration);
  }
  return builder.finish();
}

export const currentLineLigaturesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildCurrentLineDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildCurrentLineDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export function currentLineLigatures(): Extension {
  return [currentLineLigaturesPlugin];
}
