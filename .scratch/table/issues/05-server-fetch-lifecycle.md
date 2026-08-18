# 05 — Server-mode fetch lifecycle

Type: grilling
Status: resolved
Blocked by: None

## Question

How does server mode own fetching and state?

- When does `dataSource` fire — initial mount, and on every pagination/sort/filter change? Debounce for filters?
- Loading/error/empty states: what's rendered, and is there a retry affordance?
- Stale-response handling: rapid successive requests — how are out-of-order responses ignored (request id / AbortController)?
- Pagination contract: initial page/size (from config or default), response-driven `total`/`totalPages` update, page reset when filters/sort change.

Work via `/grilling`. Record the decision; block the build (06) on it.

## Answer

**Fetch triggers.** `dataSource` fires once on mount (no debounce); immediately on pagination and sort changes; on filter changes it's debounced ~300ms (the filter applies client-side for feedback, the server fetch waits out the debounce). Filter/sort changes reset the page to 1 in the same request.

**States.** Loading: previous rows stay visible, dimmed, with a subtle spinner in the `role="status"` results region — no skeleton rows. Error: body replaced with a neutral message ("Couldn't load data") + a Retry button that re-fires the last request; announced via `role="status"`. Empty: zero rows with no active filters → "No data yet"; zero rows with active filters → "No results match your filters" + a "Clear filters" action; column-spanning row. Local mode reuses the error/empty rendering (single mount call, no loading state).

**Stale responses.** A monotonic request id guards out-of-order resolves — only the latest id's response is applied. A `useEffect` cleanup `ignore` flag drops the in-flight response when params change or the component unmounts. No AbortController; the table refuses stale results, never cancels work. A later request's failure surfaces even if a dropped earlier one succeeded.

**Pagination contract.** `TableConfig` gains optional `pagination: { page?: number; size?: number }`, defaults `page: 1`, `size: 10` (local mode reads size from it too). Every server-mode `TableDataRequest` includes `pagination: { page, size }`. The component mirrors `TableDataResponse.pagination` (`total`, `size`, `page`, `totalPages`) directly in the pager; it does not re-derive or clamp — the server owns page math. Missing response pagination falls back to defaults.