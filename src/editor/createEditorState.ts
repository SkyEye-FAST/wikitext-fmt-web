import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension, Prec } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from "@codemirror/view";

import type { DocumentStatistics } from "../utils/document.js";
import { changedLineDecorations } from "./changedLineDecorations.js";
import { createWikitextExtensions } from "./createWikitextExtensions.js";
import { currentLineLigatures } from "./currentLineLigatures.js";
import {
  createEditorTheme,
  createSyntaxTheme,
  type ResolvedTheme,
} from "./themes.js";

export interface EditorExtensionOptions {
  readOnly: boolean;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  onDocumentChange?: (statistics: DocumentStatistics) => void;
  enableChangedLines?: boolean;
  placeholder?: string;
  onFormat?: () => void;
}

export interface EditorStateOptions extends EditorExtensionOptions {
  doc: string;
}

export function createEditorExtensions(
  options: EditorExtensionOptions,
): Extension[] {
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
    // Read-only content is not contenteditable, so without a tab stop a
    // keyboard user could neither select nor scroll it.
    EditorView.contentAttributes.of({ tabindex: "0" }),
    createEditorTheme(options.theme),
    currentLineLigatures(),
  ];

  if (options.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }
  if (options.enableChangedLines) {
    extensions.push(...changedLineDecorations());
  }
  if (options.placeholder) {
    extensions.push(placeholder(options.placeholder));
  }
  if (options.onFormat) {
    const onFormat = options.onFormat;
    // Outrank defaultKeymap, whose Mod-Enter would insert a blank line first.
    extensions.push(
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onFormat();
              return true;
            },
          },
        ]),
      ),
    );
  }
  if (options.onDocumentChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          options.onDocumentChange?.({
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
