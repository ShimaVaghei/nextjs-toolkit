# 17 — Always-async dataSource + local-mode loading/error

**What to build:** `dataSource` always returns a `Promise<TableDataResponse<T>>` in both modes; the synchronous branch is removed. `loading` initializes `true` in both modes, and local mode shows a loading spinner on first load instead of rendering blank, dims the current rows with a spinner while a refresh is in flight, and gains the same "Couldn't load data" + Retry state as server mode. Demo pages and tests are updated to the async contract.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `TableConfig.dataSource` is typed `(request: TableDataRequest) => Promise<TableDataResponse<T>>` in both modes.
- [ ] Local mode shows a loading spinner on first load rather than a blank table.
- [ ] Local mode dims the current rows and shows a spinner while a refresh is in flight.
- [ ] A rejected local fetch shows "Couldn't load data" with a working Retry that re-fetches.
- [ ] The local demo's `dataSource` and every test `dataSource` resolve a promise.
- [ ] Tests at the Table component seam cover the loading spinner, dim-on-refresh, and error + Retry paths, awaiting async loads.