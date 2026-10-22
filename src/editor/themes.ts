import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export type ResolvedTheme = "light" | "dark";

// Colors come from tokens.css so light and dark stay in one place.
const sharedTheme = {
  "&": {
    height: "100%",
    fontSize: "13.5px",
    backgroundColor: "var(--paper)",
    color: "var(--ink)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.65",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "12px 0 40px",
    caretColor: "var(--progressive)",
  },
  ".cm-line": { padding: "0 16px 0 12px" },
  ".cm-gutters": {
    backgroundColor: "var(--paper)",
    color: "var(--ink-faint)",
    border: "none",
    borderRight: "1px solid var(--rule-soft)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 14px",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px 0 0" },
  ".cm-activeLine": { backgroundColor: "var(--active-line)" },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--active-line)",
    color: "var(--ink)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
    {
      backgroundColor: "var(--selection) !important",
    },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--progressive)",
    borderLeftWidth: "2px",
  },
  ".cm-placeholder": { color: "var(--ink-faint)" },
  ".cm-panels": {
    backgroundColor: "var(--chrome)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--rule)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--rule)" },
  ".cm-searchMatch": {
    backgroundColor: "var(--warning-soft)",
    outline: "1px solid var(--warning)",
  },
  ".cm-selectionMatch": { backgroundColor: "var(--progressive-soft)" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--progressive-soft)",
    outline: "1px solid var(--progressive)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--raised)",
    border: "1px solid var(--rule)",
    borderRadius: "4px",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--chrome)",
    border: "1px solid var(--rule)",
    color: "var(--ink-subtle)",
  },
} as const;

export function createEditorTheme(theme: ResolvedTheme) {
  return EditorView.theme(sharedTheme, { dark: theme === "dark" });
}

export function createSyntaxTheme() {
  return syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: [tags.heading, tags.keyword],
        color: "var(--syntax-heading)",
        fontWeight: "700",
      },
      {
        tag: [tags.link, tags.url],
        color: "var(--syntax-link)",
      },
      { tag: [tags.string, tags.atom], color: "var(--syntax-string)" },
      {
        tag: [tags.tagName, tags.attributeName, tags.meta],
        color: "var(--syntax-tag)",
      },
      { tag: [tags.number, tags.bool], color: "var(--syntax-number)" },
      {
        tag: tags.comment,
        color: "var(--syntax-comment)",
        fontStyle: "italic",
      },
      {
        tag: tags.invalid,
        color: "var(--destructive)",
        textDecoration: "underline wavy",
      },
    ]),
  );
}
