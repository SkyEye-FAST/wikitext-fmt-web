# Wikitext Formatter

Wikitext Formatter is a static, browser-only interface for safely formatting MediaWiki Wikitext. It uses the published [`wikitext-fmt`](https://github.com/SkyEye-FAST/wikitext-fmt) package and runs all parsing and formatting locally in a module Web Worker.

Formatting runs locally in your browser. Source text is not uploaded, logged, placed in URLs, or persisted in browser storage.

## Features

- Two CodeMirror 6 editors, Source and Result, joined by a Format button with its Ctrl/Cmd+Enter shortcut. Both have line numbers, search, bracket matching, optional line wrapping, and MediaWiki Wikitext highlighting.
- Explicit formatting through `wikitext-fmt/browser`; formatting never runs on each keystroke or on the main UI thread.
- A status bar for every outcome (formatted, no changes, not formatted when the result fails verification, error, out of date) with per-rule change counts that jump to the affected line, and the core's failure code with its stage and message as a tooltip.
- A Changes tab with a side-by-side merge view on wide screens and a unified view on narrow ones.
- Paste, open or drop a file, load an example, copy, download, replace the source with the result (undoable), and clear with Undo.
- A settings sheet with Default and Complete presets, per-rule controls, the theme and line-wrapping choices, and the formatter and web app versions.
- System, light and dark themes; responsive layouts down to 320px and 200% zoom.
- No backend, analytics, advertising, external parser CDN, service worker, or Wikitext preview rendering.

This project is independent of the core formatter repository and consumes the exact published npm dependency `wikitext-fmt: "0.10.0"` as an ordinary external application. It is not affiliated with the Wikimedia Foundation.

## Requirements and development

- Node.js `^22.13.0` or `>=24.11.0`
- pnpm `11.17.0` through Corepack

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The development server prints its local URL. The production application is a plain Vite `dist/` directory:

```sh
pnpm build
pnpm preview
```

Set `VITE_BASE_PATH` when deploying below a repository path:

```sh
VITE_BASE_PATH=/wikitext-fmt-web/ pnpm build
```

The default base is `/`, which is suitable for a custom domain or Cloudflare Pages.

## Architecture

```text
React UI / stable CodeMirror editors
            │ typed requests and responses
            ▼
module Web Worker
            │ public browser entry only
            ▼
wikitext-fmt/browser + bundled wikiparser-node runtime
```

- `src/app/` composes the workspace and application state.
- `src/components/` contains the header, Source and Result panes, the format seam, the report bar, and the lazily loaded settings and diff surfaces.
- `src/editor/` owns CodeMirror state, local Wikitext language support, and themes.
- `src/formatter/` owns the typed Worker protocol, transport, cancellation, result classification, and the only formatter runtime import.
- `src/settings/` validates, migrates, and persists theme and formatter settings.
- `scripts/check-bundle.mjs` inspects the production application and full Worker graph.

CodeMirror is the mutable authority for the source document; ordinary keystrokes update only editor-local statistics and do not copy the full document into React state. A completed formatting run retains one immutable submitted snapshot together with source and formatter-option revisions, the detailed result, and duration. Output, diagnostics, and Diff are derived from that one run. Editing source or formatting options keeps the prior output visible but marks it outdated; Diff continues comparing the submitted snapshot with its own output. A new result is discarded if either revision changes before the Worker responds. Theme, language, line wrapping, and panel visibility do not invalidate output.

**Replace source** is available only for a current successful run. It replaces the CodeMirror source document in one transaction with its own undo step, returns focus to the source editor, and clears the completed run so an earlier snapshot cannot be mistaken for a result for the newly applied source.

Every format request receives a monotonically increasing ID and a Worker generation. The explicit `initialize` handshake produces exactly one generation-bound `ready` response after the formatter module has loaded. The client rejects superseded operations, settles pending work exactly once on restart, and ignores all messages and errors from old generations. Stop terminates the busy Worker and creates a new module Worker while CodeMirror source and settings remain intact. Module-load errors, invalid responses, and formatter exceptions are presented as unexpected errors; structured formatter failures remain distinct and retain the core package's exact code, stage, and message.

The main React bundle imports only public `wikitext-fmt/browser` types. `formatWikitextSafeDetailed`, `defaultOptions`, and `ruleLevels` are runtime imports only in `formatter.worker.ts`. Core defaults are sent to the UI in the Worker's ready message.

## Formatter settings

The settings sheet exposes:

- Preset: Default or Complete.
- Templates: template formatting, line width, one-line call spacing, and multi-line parameter layout.
- Tables: table formatting and how cells joined with `||` or `!!` are laid out. "Keep as written" preserves only inline cell separators.
- Page layout: headings, lists, space around headings, blank-line collapsing, and break-tag style.
- Links and footer: wikilinks, external links, file links, references, redirects, categories, behavior switches, interlanguage links, their positions, and language prefixes.
- Display: theme and line wrapping.
- Advanced: rule reliability limit and the read-only parser configuration.

The parser configuration is read-only: **MediaWiki bundled browser configuration**. The first release does not expose arbitrary `parserConfig`, siteinfo fetching, or complex localization alias editing. The formatter browser build supports only its bundled `mediawiki`/`default` configuration.

Only the language preference, theme preference, line-wrapping preference, and validated formatter settings are saved to `localStorage`. Source, output, completed-run snapshots, files, diagnostics, and failure details are never persisted.

## Language support

The UI is available in **English**, **简体中文** (Simplified Chinese), and **繁體中文** (Traditional Chinese). A language menu sits in the page header.

| Setting | Behaviour |
| --- | --- |
| Browser language | Detects the best match from `navigator.languages` (zh-CN/zh-SG/zh-MY → zh-Hans; zh-TW/zh-HK/zh-MO → zh-Hant; other → English). |
| English | Forces the English UI regardless of browser settings. |
| 简体中文 | Forces Simplified Chinese. |
| 繁體中文 | Forces Traditional Chinese. |

The language preference is stored in `localStorage` (settings schema v3) so it is available before the formatter Worker finishes loading. Changing the language updates all React UI text, CodeMirror and diff accessible names, `document.documentElement.lang`, the page title, and meta tags immediately without rebuilding the Worker or clearing source text.

**The formatter core returns diagnostics, failure codes, failure messages, and rule IDs in English.** The UI names each failure code with a short translated phrase and keeps the core's exact original message as the code's tooltip so it remains searchable.

The Chinese catalogs contain no manual spaces between Han characters and Latin letters or digits. The page sets CSS `text-autospace: normal`, so browsers that support it add that spacing; code, shortcuts and the editors opt out. Browsers without `text-autospace` show the text unspaced, and no spacing is added next to symbols such as `||` or `<br>`.

## Testing and verification

```sh
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm check:bundle
pnpm exec playwright install chromium firefox webkit
pnpm e2e
pnpm check
```

Vitest and React Testing Library cover settings validation/migration, storage privacy, Worker typing/lifecycle/stale responses, classification, structured failure rendering, helpers, statistics, and settings reset actions. Integration tests run the real installed `wikitext-fmt@0.10.0` browser package for headings, templates, table captions and attributes, split/preserve separators, nested and top-level list boundaries, redirects, references, interlanguage links, unchanged text, structured fail-closed output, CRLF, and idempotency.

Playwright provides full Chromium coverage plus focused Firefox and WebKit smoke coverage. It covers iterative format → out of date → Changes → reformat → replace source → undo flows, presets and setting persistence, file drop, clear with undo, settings focus handling, Stop/recreation, fail-closed details, language switching, unique-marker network and storage privacy checks, axe accessibility scans, 200% zoom, and responsive layouts.

The bundle check rejects Node built-ins, `fast-glob`, CLI/config-discovery/VS Code code, core-workspace references, and deep package imports in the Worker graph. It reports raw and gzip baselines without arbitrary failure thresholds.

## Deployment

### Cloudflare Pages

Create a Pages project connected to this repository with:

```text
Build command: pnpm build
Output directory: dist
```

Use Node 24 and leave `VITE_BASE_PATH` unset for a root deployment. `public/_headers` adds a restrictive Content Security Policy and related static security headers, and prevents Cloudflare from automatically injecting Web Analytics into the formatter page. No Cloudflare runtime or backend is required.

## Versioning and releases

Frontend releases use annotated tags named `web-v<version>` (for example, `web-v0.1.0`). The `core-v*` namespace belongs to the `wikitext-fmt` core package and is not used here. A frontend tag is created only after the exact commit passes CI and its Cloudflare Pages production deployment has been verified.

## Browser support

The build target is ES2022 because the formatter browser runtime uses modern ESM and top-level initialization. Current Chromium, Firefox, and Safari releases with module Worker, Blob download, Clipboard, and CodeMirror support are expected. Clipboard access may require HTTPS or explicit browser permission; the output editor remains selectable as a fallback.

## Known limitations

- The application does not render a live MediaWiki preview and never injects Wikitext as HTML.
- Parsing uses the bundled MediaWiki/default browser configuration; named filesystem parser configurations are Node-only.
- Siteinfo and advanced localization alias controls are not exposed in the first release.
- Very large documents are allowed and produce a warning; formatting and visible diff computation can still consume substantial memory.
- Diff is computed only while the diff surface is visible.

## Dependency policy

Dependabot proposes grouped weekly npm updates and monthly GitHub Actions updates. Formatter upgrades are reviewed deliberately: keep `wikitext-fmt` exact, repeat the official npm external-consumer preflight, inspect browser exports, run the real integration corpus, and re-check the Worker bundle before changing the pinned version.

## License

GPL-3.0-or-later. See `LICENSE`.
