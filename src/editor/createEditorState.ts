import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { createEditorTheme, createSyntaxTheme, type ResolvedTheme } from "./themes.js";
import { createWikitextExtensions } from "./createWikitextExtensions.js";

export interface EditorStateOptions {
  doc: string;
  readOnly: boolean;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  onChange?: (value: string, statistics: { characters: number; lines: number }) => void;
}

export function createEditorExtensions(options: EditorStateOptions): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    ...createWikitextExtensions(),
    createSyntaxTheme(),
    EditorState.readOnly.of(options.readOnly),
    EditorView.editable.of(!options.readOnly),
    createEditorTheme(options.theme),
  ];

  if (options.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }
  if (options.onChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          options.onChange?.(update.state.doc.toString(), {
            characters: update.state.doc.length,
            lines: update.state.doc.length === 0 ? 0 : update.state.doc.lines,
          });
        }
      }),
    );
  }
  return extensions;
}

export function createEditorState(options: EditorStateOptions): EditorState {
  return EditorState.create({
    doc: options.doc,
    extensions: createEditorExtensions(options),
  });
}
