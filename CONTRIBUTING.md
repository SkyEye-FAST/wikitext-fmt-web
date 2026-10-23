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
- Never persist, log, place in URLs, or transmit Wikitext source. The only requests to a wiki are siteinfo on Fetch and TemplateData for the template being completed.
- Add focused tests for result interpretation, settings migration, Worker lifecycle, and user-visible flows.
- Run `pnpm check`, `pnpm e2e`, and `pnpm check:bundle` before opening a pull request.
- Update the README when browser support, deployment, settings, or privacy behavior changes.

## Reviewed bundle baseline

The 0.7.0 release build, including editor typography controls, site profiles, and the bundled wiki preset, records the following informational baseline. These are reviewed measurements, not arbitrary failure thresholds:

| Surface | Raw | Gzip |
| --- | ---: | ---: |
| Initial application JavaScript | 904.94 KiB | 285.97 KiB |
| Initial application CSS | 31.92 KiB | 9.38 KiB |
| Complete formatter Worker graph | 323.02 KiB | 104.83 KiB |
| Diff chunk | 0.67 KiB | 0.46 KiB |
| Settings chunk | 23.40 KiB | 6.80 KiB |

Run `pnpm build && pnpm check:bundle` to regenerate the report. The check identifies entries and their full static/dynamic relationships from emitted Vite/Rollup graph metadata, and rejects browser-incompatible or out-of-scope dependencies.
