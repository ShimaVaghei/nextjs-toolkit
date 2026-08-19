# 17 — Always-async dataSource + local-mode loading/error

**What to build:** `dataSource` always returns a `Promise<TableDataResponse<T>>` in both modes; the synchronous branch is removed. `loading` initializes `true` in both modes, and local mode shows a loading spinner on first load instead of rendering blank, dims the current rows with a spinner while a refresh is in flight, and gains the same "Couldn't load data" + Retry state as server mode. Demo pages and tests are updated to the async contract.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] `TableConfig.dataSource` is typed `(request: TableDataRequest) => Promise<TableDataResponse<T>>` in both modes.
- [x] Local mode shows a loading spinner on first load rather than a blank table.
- [x] Local mode dims the current rows and shows a spinner while a refresh is in flight.
- [x] A rejected local fetch shows "Couldn't load data" with a working Retry that re-fetches.
- [x] The local demo's `dataSource` and every test `dataSource` resolve a promise.
- [x] Tests at the Table component seam cover the loading spinner, dim-on-refresh, and error + Retry paths, awaiting async loads.

## Answer

Built the always-async `dataSource` contract + local-mode loading/error in `components/Table.tsx` (69 tests in `Table.test.tsx`, full suite 153 green + the one pre-existing `AppLayout` failure; typecheck and lint clean).

- `TableConfig.dataSource` now returns `Promise<TableDataResponse<T>>` only; the local-mode synchronous branch is removed.
- `loading` initializes `true` in both modes; the early local-mode `return null` is removed, so first load renders the table shell with the shared `Loading…` spinner + dimmed tbody.
- The local fetch effect is promise-based, handles rejection (`setError(true)`), and is keyed on `[serverSide, retryToken]` so Retry re-fetches the full dataset. The dimmed-tbody and status-spinner conditions drop their `serverSide` guard; local mode renders the same "Couldn't load data" + Retry as server mode.
- `beginRequest` is mode-agnostic (its only server-side call sites, page/sort, keep their own `serverSide` guards), and `handleRetry` now drives both modes.
- Demo: `app/table/local/page.tsx` dataSource is `async`; every test dataSource resolves a promise; local tests await async loads via a new `renderLocal` helper.
- New tests: first-load spinner → rows; dim + spinner during a Retry refresh; error + working Retry recovery.