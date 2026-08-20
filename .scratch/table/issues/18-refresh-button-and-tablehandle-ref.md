# 18 — Refresh affordances: button + TableHandle ref

**What to build:** A single reload path (merging the existing retry token) feeds both the server and local fetch effects. A refresh button appears in the top-right of a header above the table in server mode — an icon button labelled "Refresh", disabled while a request is in flight, re-firing the current request without resetting the page. The Table also exposes an imperative `TableHandle` (`{ refresh(): void }`) through its `ref` prop: `refresh()` re-fires the current request in server mode and re-fetches the full dataset in local mode. The caption (when set) renders in the same header above the table, not in a native `<caption>`.

**Blocked by:** 17 — Always-async dataSource + local-mode loading/error

**Status:** resolved

- [x] Server mode shows a refresh button in the top-right of the header above the table; local mode does not.
- [x] Clicking the refresh button re-fires the current request (same page, sort, and filters) and the button is disabled while loading.
- [x] A parent can pass a `ref` and call `refresh()` to re-fire the current request in server mode.
- [x] A parent can call `refresh()` in local mode to re-fetch the full dataset, with the loading dim/spinner from ticket 17.
- [x] The refresh button, the Retry action, and `ref.refresh()` all share one reload path.
- [x] Tests at the Table component seam cover button presence/absence, disabled-while-loading, and `ref.refresh()` in both modes.