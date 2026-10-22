import { presentableDiff } from "@codemirror/merge";
import { RangeSetBuilder, StateEffect, StateField, Text } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

export const MAX_CHANGED_LINES_THRESHOLD = 20000;

function countLines(str: string): number {
  let count = 1;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === 10) count++;
  }
  return count;
}

export function computeChangedLines(
  source: string,
  output: string,
  maxLines = MAX_CHANGED_LINES_THRESHOLD,
): Set<number> {
  if (!source || !output || source === output) return new Set();

  if (countLines(source) > maxLines || countLines(output) > maxLines) {
    return new Set();
  }

  const changes = presentableDiff(source, output);
  if (changes.length === 0) return new Set();

  const outDoc = Text.of(output.split("\n"));
  const changed = new Set<number>();

  for (const ch of changes) {
    let startPos = ch.fromB;
    let endPos = ch.toB;
    if (endPos > startPos && output.charAt(startPos) === "\n") {
      startPos++;
    }
    if (endPos > startPos && output.charAt(endPos - 1) === "\n") {
      endPos--;
    }
    const fromLine = outDoc.lineAt(Math.min(startPos, outDoc.length)).number;
    const toLine = outDoc.lineAt(Math.min(endPos, outDoc.length)).number;
    for (let l = fromLine; l <= toLine; l++) {
      changed.add(l);
    }
  }

  return changed;
}

export const setChangedLines = StateEffect.define<Set<number>>();

const changedLinesField = StateField.define<Set<number>>({
  create: () => new Set(),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setChangedLines)) return effect.value;
    }
    return value;
  },
});

const changedLineDecoration = Decoration.line({ class: "cm-output-changed" });

function buildDecorations(view: EditorView): DecorationSet {
  const lines = view.state.field(changedLinesField);
  if (lines.size === 0) return Decoration.none;
  const builder = new RangeSetBuilder<Decoration>();
  let lastLineNo = 0;
  for (const { from, to } of view.visibleRanges) {
    let lineNo = Math.max(lastLineNo + 1, view.state.doc.lineAt(from).number);
    const endNo = view.state.doc.lineAt(to).number;
    for (; lineNo <= endNo; lineNo++) {
      if (lines.has(lineNo)) {
        const line = view.state.doc.line(lineNo);
        builder.add(line.from, line.from, changedLineDecoration);
      }
      lastLineNo = lineNo;
    }
  }
  return builder.finish();
}

const changedLinesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setChangedLines)),
        )
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export function changedLineDecorations() {
  return [changedLinesField, changedLinesPlugin];
}
