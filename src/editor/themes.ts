import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export type ResolvedTheme = "light" | "dark";

const sharedTheme = {
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "var(--editor-bg)",
    color: "var(--text)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.62",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "10px 0 28px",
    caretColor: "var(--accent)",
  },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter)",
    color: "var(--text-subtle)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--editor-active-line)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--selection) !important",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  ".cm-panels": {
    backgroundColor: "var(--surface-raised)",
    color: "var(--text)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--warning-soft)",
    outline: "1px solid var(--warning)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--surface-raised)",
    border: "1px solid var(--border-strong)",
  },
} as const;

export function createEditorTheme(theme: ResolvedTheme) {
  return EditorView.theme(sharedTheme, { dark: theme === "dark" });
}

export function createSyntaxTheme() {
  return syntaxHighlighting(HighlightStyle.define([
    { tag: [tags.heading, tags.keyword], color: "var(--accent)", fontWeight: "700" },
    { tag: [tags.link, tags.url], color: "var(--accent)", textDecoration: "underline" },
    { tag: [tags.string, tags.atom], color: "var(--success)" },
    { tag: [tags.tagName, tags.attributeName, tags.meta], color: "var(--warning)" },
    { tag: [tags.number, tags.bool], color: "var(--syntax-number)" },
    { tag: tags.comment, color: "var(--text-subtle)", fontStyle: "italic" },
    { tag: tags.invalid, color: "var(--failure)", textDecoration: "underline wavy" },
  ]));
}
