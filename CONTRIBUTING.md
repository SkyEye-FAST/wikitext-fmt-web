# Contributing

Thank you for improving Wikitext Formatter. Keep changes conservative: the web application must preserve the fail-closed behavior of `wikitext-fmt` and must never move formatting onto the main UI thread.

## Setup

Use Node.js `^22.13.0` or `>=24.11.0` and the pnpm version pinned in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm e2e
```

## Pull requests

- Keep runtime formatter imports inside `src/formatter/formatter.worker.ts`.
- Never persist, log, place in URLs, or transmit Wikitext source.
- Add focused tests for result interpretation, settings migration, Worker lifecycle, and user-visible flows.
- Run `pnpm check`, `pnpm e2e`, and `pnpm check:bundle` before opening a pull request.
- Update the README when browser support, deployment, settings, or privacy behavior changes.
