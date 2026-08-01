# Changelog

## Unreleased

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

## 0.1.1 — 2026-08-01

- Preserve the Theme selector's accessible name when its visible label is hidden at mobile widths.
- Add mobile axe coverage for the responsive header controls.
- Prevent Cloudflare from automatically injecting Web Analytics into the formatter page without weakening its Content Security Policy.
- Make the scrollable diagnostics region keyboard-focusable and cover its constrained Diff layout with axe.

## 0.1.0 — 2026-08-01

- Add the browser-only React/Vite Wikitext formatter powered by exact dependency `wikitext-fmt@0.6.0`.
- Run safe detailed formatting in a cancellable module Web Worker with typed stale-response protection.
- Add CodeMirror Wikitext editors, merge diff, structured diagnostics, persistent validated settings, local file handling, copy, and download workflows.
- Add responsive light/dark UI, privacy and accessibility safeguards, Vitest/Playwright coverage, bundle verification, CI, and Cloudflare Pages compatibility.
- Make CodeMirror the source-document authority and discard results from superseded source snapshots without retaining a second full input string in React.
- Make Worker startup deterministic with an explicit generation-bound handshake, cold-start-safe dynamic loading, and race-tested restart/error isolation.
- Derive the web and formatter versions from root package metadata and verify the displayed build metadata.
- Verify the complete emitted Worker graph and record raw/gzip bundle baselines from Vite/Rollup manifests.
- Add Firefox/WebKit smoke coverage, axe accessibility audits, unique-marker privacy tests, Stop recovery, 200% zoom, and desktop/tablet/mobile visual QA.
- Fix light/dark contrast, dialog landmarks, mobile/tablet overflow, status wrapping, and long diagnostic message handling found during real-browser QA.
