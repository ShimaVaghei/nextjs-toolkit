# 08 — Local-mode table shell + pagination

**What to build:** A working local-mode `Table` that takes a `TableConfig<T>`, calls its `dataSource` once for the full dataset, renders a native table (caption, column headers, one row per record) with text cells, and paginates client-side through a pager (prev/next, page buttons, current page marked `aria-current="page"`, native disabled at the ends). A `role="status"` region announces the "Showing X–Y of Z" summary and updates as pages change; zero rows with no active filters show "No data yet". Column and config types are exported from the component module.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [ ] A local-mode config renders a caption, all column headers, and every row of the first page, with text cells and a muted em-dash for empty values.
- [ ] The pager shows page buttons plus prev/next, marks exactly one page with `aria-current="page"`, and natively disables prev/next at the ends.
- [ ] Navigating pages updates the rendered rows and the "Showing X–Y of Z" summary in a single polite `role="status"` region.
- [ ] The optional `pagination: { page?, size? }` config (defaults page 1, size 10) drives the initial page and page size in local mode.
- [ ] `dataSource` is called exactly once for the full dataset, never again on pagination.
- [ ] A config with zero rows and no active filters renders "No data yet" across a column-spanning row.
- [ ] Tests cover headers/rows, empty-state em-dash, pagination navigation, pager a11y (`aria-current`, disabled ends), and the single `dataSource` call, following the AppLayout test conventions.

## Answer

Built the local-mode shell in `components/Table.tsx` (client component) with all exported types (`TableConfig<T>`, `TableColumn<T>`, `TableColumnType`, `TableDataRequest`, `TableDataResponse<T>`, plus `TableSort`, `TableSortDirection`, `TableFilterValue`, `TablePagination`). Local mode (`serverSide` defaults false) fetches the full dataset exactly once on mount via a ref-captured `dataSource` (sync resolver sets rows synchronously, thenable resolved asynchronously) and paginates client-side.

Contract additions while settling the spec: `TableConfig` gains an optional `caption` (source of the native `<caption>`, required by the a11y pattern) and `TableColumn` gains an optional `label` (header text, defaulting to the column key) — both recorded in `CONTEXT.md`.

Rendered behavior: native `<table>` with `<caption>`, `<th scope="col">` headers, text cells with a muted `text-neutral-400` em-dash for `null`/`undefined`; a column-spanning "No data yet" row when the dataset is empty; a single polite `role="status"` region holding "Showing X–Y of Z" (0–0 of 0 when empty) that updates on every page change; a `<nav aria-label="Pagination">` pager with page buttons, `aria-current="page"` on exactly the current page, and natively `disabled` prev/next at the ends. `pagination: { page?, size? }` (defaults 1/10) seeds the initial page and size; the page is clamped to the derived page count. Styling matches the AppLayout neutral + dark-mode palette.

Tests in `components/Table.test.tsx` (vitest + RTL + jest-dom, AppLayout conventions): headers/rows on the first page, em-dash empty state (with `text-neutral-400`), single polite `role="status"` summary, `aria-current`/disabled pager ends, page navigation updating rows + summary, config-driven initial page/size, out-of-range page seeding clamped to the last page with navigation still working, `dataSource` called exactly once with `{}` (never on pagination), and the column-spanning "No data yet" row. 9 tests, all green; typecheck and lint clean.