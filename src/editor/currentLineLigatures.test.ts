import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import {
  buildCurrentLineDecorations,
  CURRENT_LINE_LIGATURES_CLASS,
  currentLineLigatures,
} from "./currentLineLigatures.js";

describe("currentLineLigatures", () => {
  it("decorates lines containing cursor or selection", () => {
    const doc = "Line 1\nLine 2\nLine 3\nLine 4";
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(8), // On Line 2
    });

    const decorations = buildCurrentLineDecorations(state);
    const decoratedPositions: number[] = [];
    decorations.between(0, state.doc.length, (from, _to, value) => {
      decoratedPositions.push(from);
      expect(value.spec.class).toBe(CURRENT_LINE_LIGATURES_CLASS);
    });

    expect(decoratedPositions).toEqual([state.doc.line(2).from]);
  });

  it("decorates all lines spanned by a multi-line selection", () => {
    const doc = "Line 1\nLine 2\nLine 3\nLine 4";
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(2, 16), // Spans line 1 to line 3
    });

    const decorations = buildCurrentLineDecorations(state);
    const decoratedPositions: number[] = [];
    decorations.between(0, state.doc.length, (from) => {
      decoratedPositions.push(from);
    });

    expect(decoratedPositions).toEqual([
      state.doc.line(1).from,
      state.doc.line(2).from,
      state.doc.line(3).from,
    ]);
  });

  it("handles multi-cursor selections across multiple lines", () => {
    const doc = "Line 1\nLine 2\nLine 3\nLine 4";
    const baseState = EditorState.create({
      doc,
      extensions: [EditorState.allowMultipleSelections.of(true)],
    });
    const state = baseState.update({
      selection: EditorSelection.create([
        EditorSelection.cursor(0), // Line 1
        EditorSelection.cursor(baseState.doc.line(4).from), // Line 4
      ]),
    }).state;

    const decorations = buildCurrentLineDecorations(state);
    const decoratedPositions: number[] = [];
    decorations.between(0, state.doc.length, (from) => {
      decoratedPositions.push(from);
    });

    expect(decoratedPositions).toEqual([
      state.doc.line(1).from,
      state.doc.line(4).from,
    ]);
  });

  it("updates decorations in EditorView when selection moves", () => {
    const doc = "Line 1\nLine 2\nLine 3";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [currentLineLigatures()],
        selection: EditorSelection.cursor(0),
      }),
    });

    view.dispatch({
      selection: EditorSelection.cursor(view.state.doc.line(3).from),
    });

    const decorations = buildCurrentLineDecorations(view.state);
    const decoratedPositions: number[] = [];
    decorations.between(0, view.state.doc.length, (from) => {
      decoratedPositions.push(from);
    });

    expect(decoratedPositions).toEqual([view.state.doc.line(3).from]);
    view.destroy();
  });
});
