# Changelog

## Unreleased

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
