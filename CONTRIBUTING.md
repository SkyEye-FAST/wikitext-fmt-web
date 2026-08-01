# Contributing

Thank you for improving Wikitext Formatter. Keep changes conservative: the web application must preserve the fail-closed behavior of `wikitext-fmt` and must never move formatting onto the main UI thread.

## Setup

Use Node.js `^22.13.0` or `>=24.11.0` and the pnpm version pinned in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium firefox webkit
pnpm e2e
```

## Pull requests

- Keep runtime formatter imports inside `src/formatter/formatter.worker.ts`.
- Never persist, log, place in URLs, or transmit Wikitext source.
- Add focused tests for result interpretation, settings migration, Worker lifecycle, and user-visible flows.
- Run `pnpm check`, `pnpm e2e`, and `pnpm check:bundle` before opening a pull request.
- Update the README when browser support, deployment, settings, or privacy behavior changes.

## Reviewed bundle baseline

The current Unreleased build, including the three statically imported UI catalogs and formatting-run provenance workflow, records the following informational baseline. These are reviewed measurements, not arbitrary failure thresholds:

| Surface | Raw | Gzip |
| --- | ---: | ---: |
| Initial application JavaScript | 665.93 KiB | 209.57 KiB |
| Initial application CSS | 12.35 KiB | 3.40 KiB |
| Complete formatter Worker graph | 251.22 KiB | 83.71 KiB |
| Diff chunk | 28.74 KiB | 9.88 KiB |
| Settings chunk | 8.44 KiB | 1.91 KiB |

Run `pnpm build && pnpm check:bundle` to regenerate the report. The check identifies entries and their full static/dynamic relationships from emitted Vite/Rollup graph metadata, and rejects browser-incompatible or out-of-scope dependencies.
