# Changelog

## Unreleased

### Changed

- Redesign the workspace: Source and Result editors joined by a Format
  button, Result and Changes tabs, and a report bar with a one-sentence
  status, the active preset, and expandable details. On narrow screens one
  pane shows at a time.
- Rewrite all interface copy in English, Simplified Chinese, and Traditional
  Chinese. Failure codes are now explained in plain language, with the core's
  exact message kept under Technical details.
- Add an empty-source card with Paste, Open a file, and Try an example, and
  accept files dropped onto the source.
- Move settings into a modal sheet with Default and Complete presets, inline
  previews of layout choices, and the theme choice.
- Replace the inline notices with toasts; clearing the source can be undone
  from the toast.
- Restyle with a MediaWiki Codex–based palette, Libertinus Serif headings,
  and JetBrains Mono editors.
- Remove manual spaces between Han and Latin text from the Chinese catalogs;
  supporting browsers add the spacing through CSS `text-autospace`.
- Add `radix-ui`, `sonner`, `@fontsource/libertinus-serif`, and
  `@fontsource-variable/jetbrains-mono`.

### Fixed

- Undoing **Replace source** restores the earlier source even when it follows
  typing within the editor's undo-grouping window.
- Return focus to the control that opened Settings when the sheet closes.
- Make the scrollable editor regions keyboard-focusable.
- Deduplicate `@lezer/common` and `@lezer/highlight` so syntax highlighting
  cannot crash on mismatched copies.
- Stop the header from overflowing on narrow screens and at 200% zoom.

## 0.4.0 — 2026-10-22

### Added

- Highlight output lines changed by the current format run in the read-only
  output editor; documents over 20,000 lines skip the highlight.
- Add a diagnostics location column; table rows link to the first affected
  source line and select it in the source editor.
- Show a localized placeholder with the format shortcut in the empty output
  editor, and the shortcut in the Format button tooltip.

### Changed

- Upgrade the exact browser dependency from `wikitext-fmt@0.9.1` to
  `wikitext-fmt@0.10.0`, inheriting editor-style multiline template layout,
  page-aware heading spacing, inline table layout preservation by default, and
  faster formatting of large pages.
- Show template, list, and table layouts in the built-in example.
- Raise the smallest interface text to 12px and give the diagnostics columns
  stable widths.

### Fixed

- Ctrl/Cmd+Enter in the source editor now formats without first inserting a
  blank line at the cursor.
- Inherit the core fix that stops deeply nested templates from stalling the
  formatter Worker; markup nested more than 500 levels deep is left unchanged
  with an `input-parse` failure.

## 0.3.1 — 2026-08-24

### Changed

- Upgrade the exact browser dependency from `wikitext-fmt@0.8.1` to
  `wikitext-fmt@0.9.1`.
- Refresh the CodeMirror integration, including
  `@bhsd/codemirror-wikitext@0.11.0`, `@codemirror/commands@6.11.0`, and
  `@codemirror/view@6.43.9`.

### Fixed

- Inherit core fixes for parser-confirmed lists in nested template parameters,
  self-closing extension-tag boundaries, and case-insensitive redirect magic
  words, with direct browser integration coverage.

## 0.3.0 — 2026-08-02

### Added

- Read the formatter's supported profiles and profile overrides from the browser
  Worker, and provide the supported default and production profiles in Settings.
- Upgrade persisted settings to schema version 3, including a safe migration of
  the former aggressive profile to production.
- Add release metadata validation and a tag-triggered GitHub Release workflow
  that publishes the single reviewed static distribution artifact with checksums.

### Changed

- Upgrade the exact browser dependency from `wikitext-fmt@0.8.0` to the repaired
  `wikitext-fmt@0.8.1` release.
- Derive profile-controlled settings from core-provided metadata rather than
  duplicating profile values in the Web application.

### Fixed

- Restore browser formatting of references and parser-confirmed interlanguage
  links through the published core 0.8.1 adapter fix, with direct integration
  coverage.
- Keep the browser tab title as `Wikitext Formatter` after loading the example;
  the example filename remains available for local download naming.

## 0.2.0 — 2026-08-02

### Added

- Add immutable formatting-run provenance with submitted source and formatter
  revisions. Keep output and diagnostics visible but clearly marked outdated
  after source or formatter-option changes, while Diff remains tied to its
  submitted source snapshot.
- Add an undoable Apply output action for current successful results and cover
  stale-result, Diff provenance, apply, undo, accessibility, privacy, and
  cross-browser language workflows.
- Add a type-safe i18n system with English, Simplified Chinese (zh-Hans), and
  Traditional Chinese (zh-Hant) UI localisation. Translate all controls,
  labels, status messages, diagnostics, settings, and accessible names.
- Add a language selector (Follow browser / English / 简体中文 / 繁體中文)
  next to the existing theme selector in the page header.
- Detect the browser language preference from `navigator.languages` with
  normalisation rules for Chinese locale variants (zh-CN/zh-SG/zh-MY →
  zh-Hans; zh-TW/zh-HK/zh-MO → zh-Hant).
- Upgrade the settings storage schema from version 1 to version 2 to persist
  the language preference. Older stored settings migrate losslessly.
- Keep formatter-core diagnostics (failure code, stage, message, rule IDs,
  profile values) untranslated so they remain searchable and match existing
  tests and documentation.
- Keep one FormatterClient lifecycle across initialization, formatting, and
  language changes; persist the language only in the validated settings record
  and localize browser negotiation, metadata, client errors, and responsive
  accessibility surfaces.

### Changed

- Upgrade the exact browser dependency from `wikitext-fmt@0.6.0` to
  `wikitext-fmt@0.7.0`.
- Consume the unified `templateDiagnostics` result field and remove obsolete
  template-parameter diagnostic counters.
- Keep template settings limited to template formatting, inline spacing,
  parameter layout, and line width; the deprecated experimental
  template-parameter toggle is removed.
- Inherit core 0.7.0's safe table caption, opener, row-attribute, and separator
  normalization. Preserve mode now preserves only inline `||` and `!!`
  separators.

### Fixed

- Preserve validated supported settings when loading version-2 records that
  still contain the removed `formatTemplateParameters` property; the next
  canonical save omits it.
- Strengthen Worker response validation so result-shape drift is rejected
  instead of being silently accepted.

### Coverage

- Cover English, Simplified Chinese, and Traditional Chinese UI, browser-language
  detection, validated language persistence, result provenance and outdated
  state, Apply output and undo, accessibility, privacy, and Chromium/Firefox/
  WebKit workflows.

## 0.1.1 — 2026-08-01

- Preserve the Theme selector's accessible name when its visible label is hidden at mobile widths.
- Add mobile axe coverage for the responsive header controls.
- Prevent Cloudflare from automatically injecting Web Analytics into the formatter page without weakening its Content Security Policy.
- Make the scrollable diagnostics region keyboard-focusable and cover its constrained Diff layout with axe.

## 0.1.0 — 2026-08-01

- Add the browser-only React/Vite Wikitext formatter powered by exact dependency `wikitext-fmt@0.7.0`.
- Run safe detailed formatting in a cancellable module Web Worker with typed stale-response protection.
- Add CodeMirror Wikitext editors, merge diff, structured diagnostics, persistent validated settings, local file handling, copy, and download workflows.
- Add responsive light/dark UI, privacy and accessibility safeguards, Vitest/Playwright coverage, bundle verification, CI, and Cloudflare Pages compatibility.
- Make CodeMirror the source-document authority and discard results from superseded source snapshots without retaining a second full input string in React.
- Make Worker startup deterministic with an explicit generation-bound handshake, cold-start-safe dynamic loading, and race-tested restart/error isolation.
- Derive the web and formatter versions from root package metadata and verify the displayed build metadata.
- Verify the complete emitted Worker graph and record raw/gzip bundle baselines from Vite/Rollup manifests.
- Add Firefox/WebKit smoke coverage, axe accessibility audits, unique-marker privacy tests, Stop recovery, 200% zoom, and desktop/tablet/mobile visual QA.
- Fix light/dark contrast, dialog landmarks, mobile/tablet overflow, status wrapping, and long diagnostic message handling found during real-browser QA.
