# 12 — Server mode lifecycle

**What to build:** Server-driven data fetching. In server mode `dataSource` fires on mount, immediately on pagination and sort changes, and on a ~300ms debounce for filter changes; filter and sort changes reset the page to 1. Each request carries the current `pagination` and the active `sort`/`filters` keys. Loading keeps prior rows visible but dimmed with a spinner in the `role="status"` region; failure replaces the body with a neutral message plus a Retry button that re-fires the last request; stale responses are dropped via a monotonic request id and effect-cleanup ignore flag (no AbortController). The component mirrors the response's `pagination` (total, size, page, totalPages) without re-deriving or clamping it; missing response pagination falls back to defaults.

**Blocked by:** 10, 11

**Status:** ready-for-agent

- [ ] `dataSource` fires once on mount, immediately on page and sort changes, and on the filter debounce; filter/sort changes reset the page to 1 in the same request.
- [ ] Every server-mode request carries `pagination`, the active sort key/direction, and the active filters record.
- [ ] Loading shows prior rows dimmed with a subtle spinner in the `role="status"` region; failure shows a neutral message with a Retry that re-fires the last request.
- [ ] Out-of-order responses are dropped so only the latest request's result applies, including when an earlier request succeeds after a later one fails.
- [ ] The pager mirrors the response's `pagination` without clamping; missing response pagination falls back to defaults.
- [ ] Tests (mocked async `dataSource`) cover fetch triggers, debounced filters, page reset, loading dim, error + Retry, stale-response dropping, and pagination mirroring.