# 08 — Local-mode table shell + pagination

**What to build:** A working local-mode `Table` that takes a `TableConfig<T>`, calls its `dataSource` once for the full dataset, renders a native table (caption, column headers, one row per record) with text cells, and paginates client-side through a pager (prev/next, page buttons, current page marked `aria-current="page"`, native disabled at the ends). A `role="status"` region announces the "Showing X–Y of Z" summary and updates as pages change; zero rows with no active filters show "No data yet". Column and config types are exported from the component module.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A local-mode config renders a caption, all column headers, and every row of the first page, with text cells and a muted em-dash for empty values.
- [ ] The pager shows page buttons plus prev/next, marks exactly one page with `aria-current="page"`, and natively disables prev/next at the ends.
- [ ] Navigating pages updates the rendered rows and the "Showing X–Y of Z" summary in a single polite `role="status"` region.
- [ ] The optional `pagination: { page?, size? }` config (defaults page 1, size 10) drives the initial page and page size in local mode.
- [ ] `dataSource` is called exactly once for the full dataset, never again on pagination.
- [ ] A config with zero rows and no active filters renders "No data yet" across a column-spanning row.
- [ ] Tests cover headers/rows, empty-state em-dash, pagination navigation, pager a11y (`aria-current`, disabled ends), and the single `dataSource` call, following the AppLayout test conventions.