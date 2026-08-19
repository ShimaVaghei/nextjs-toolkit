# 12 — Server mode lifecycle

**What to build:** Server-driven data fetching. In server mode `dataSource` fires on mount, immediately on pagination and sort changes, and on a ~300ms debounce for filter changes; filter and sort changes reset the page to 1. Each request carries the current `pagination` and the active `sort`/`filters` keys. Loading keeps prior rows visible but dimmed with a spinner in the `role="status"` region; failure replaces the body with a neutral message plus a Retry button that re-fires the last request; stale responses are dropped via a monotonic request id and effect-cleanup ignore flag (no AbortController). The component mirrors the response's `pagination` (total, size, page, totalPages) without re-deriving or clamping it; missing response pagination falls back to defaults.

**Blocked by:** 10, 11

**Status:** resolved

- [x] `dataSource` fires once on mount, immediately on page and sort changes, and on the filter debounce; filter/sort changes reset the page to 1 in the same request.
- [x] Every server-mode request carries `pagination`, the active sort key/direction, and the active filters record.
- [x] Loading shows prior rows dimmed with a subtle spinner in the `role="status"` region; failure shows a neutral message with a Retry that re-fires the last request.
- [x] Out-of-order responses are dropped so only the latest request's result applies, including when an earlier request succeeds after a later one fails.
- [x] The pager mirrors the response's `pagination` without clamping; missing response pagination falls back to defaults.
- [x] Tests (mocked async `dataSource`) cover fetch triggers, debounced filters, page reset, loading dim, error + Retry, stale-response dropping, and pagination mirroring.

## Answer

Built the server-mode lifecycle in `components/Table.tsx` on top of the ticket 10/11 sort/filter work (tests written first, red, then green).

**Fetch triggers.** `dataSource` fires once on mount, immediately on page/sort change, and ~300ms after the last filter change via a debounced `debouncedFilters` state (filters debounce as a whole: the request goes out with the reset page and the new filter keys together). Sort changes (`handleSortClick`) and the filter debounce both reset the page to 1 in the same request via a shared `resetPageToFirst`. Live `filters` drive the filter controls/clear; `debouncedFilters` is what the request carries, so the empty-state message ("No results match your filters" vs "No data yet") keys off the last-confirmed request's filters, not live typing.

**Request shape.** Every server-mode request carries `pagination: { page, size }`, the active `sort` (only when sorted) and a `filters` record (always present, empty when none). Column keys translate to their `sortable`/`filterable` request keys via a single `resolveRequestKey` helper reading the current columns through a ref (avoids re-firing the fetch effect when a consumer passes inline columns). Request-start transitions (loading on / error off) live in the trigger handlers and debounce timer, not in the effect body (React 19 `set-state-in-effect` rule).

**States.** Loading keeps prior rows visible with `opacity-50` on the `<tbody>` and an `animate-spin` spinner + "Loading…" in the single `role="status"` region; first load renders the shell with an empty body. Failure replaces the body with "Couldn't load data" + Retry (`retryToken` dep re-fires the last request); the message is also announced in `role="status"`. Empty differentiates "No data yet" (no confirmed filters) from "No results match your filters" + Clear filters.

**Stale responses.** A monotonic `requestIdRef` plus the effect-cleanup `active` flag drops out-of-order resolves/rejections — only the latest request's outcome applies, including when an earlier request succeeds after a later one fails. No AbortController.

**Pagination mirroring.** The pager and summary read straight from `TableDataResponse.pagination` (`total`, `size`, `page`, `totalPages`) with no re-derivation or clamping; a missing response `pagination` falls back to defaults (total = rows.length, size = request size, page 1).

Test seam as pre-agreed (component-level, `components/Table.test.tsx`): mount + immediate page-change triggers with exact request shape; sort trigger with page reset + `sortable` request key; debounced filter with page reset in the same request + `filterable` request key (fake timers); loading dim class + status spinner; error + Retry re-firing the last request; stale-drop where the latest request wins; stale-success-after-later-failure keeping the error; response-pagination mirroring without clamping (3 rows, page 3 of 42 total); missing-pagination fallback; empty-state messaging keyed to the confirmed request's filters. 10 new tests, 56 in the file; full suite 141 green, typecheck clean, lint 0 errors (pre-existing `no-img-element` warning only). Reviewed via `/code-review` — spec axis flagged the live-filters-driven empty message and the `config.columns` effect dep (both fixed: message now keys off `debouncedFilters`; request keys resolve via a columns ref), plus inert local-mode error scaffolding (left as spec'd "reuse error/empty rendering"; local mode never errors by design); standards axis flagged duplicate page-reset/failure logic and twin key resolvers, all consolidated.