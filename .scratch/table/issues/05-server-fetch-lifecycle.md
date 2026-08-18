# 05 — Server-mode fetch lifecycle

Type: grilling
Status: open
Blocked by: None

## Question

How does server mode own fetching and state?

- When does `dataSource` fire — initial mount, and on every pagination/sort/filter change? Debounce for filters?
- Loading/error/empty states: what's rendered, and is there a retry affordance?
- Stale-response handling: rapid successive requests — how are out-of-order responses ignored (request id / AbortController)?
- Pagination contract: initial page/size (from config or default), response-driven `total`/`totalPages` update, page reset when filters/sort change.

Work via `/grilling`. Record the decision; block the build (06) on it.