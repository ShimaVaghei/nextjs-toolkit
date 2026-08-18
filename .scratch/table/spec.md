Status: ready-for-agent

# Table — Reusable Dual-Mode Data Table Component

## Problem Statement

The app has no way to render tabular data. Every page that needs to display a list of records — users, orders, logs — would have to hand-roll its own markup, pagination, sorting, and filtering, or reach for a heavy external grid library. The user wants a reusable `Table` component that takes a declarative `TableConfig`, renders rows according to per-column types, and supports pagination, sorting, and filtering in two modes: server-driven (the backend does the work, the component reflects its responses) and local (the component fetches all rows once and does the work client-side). It must be accessible, styled to match the existing neutral + dark-mode palette, and proven in a running demo page.

## Solution

A client component `Table` in `components/Table.tsx` driven by a `TableConfig<T>`. The config declares the `dataSource`, the `columns`, the `serverSide` mode, and an optional initial `pagination`. Columns render by `type` (`text`, `date`, `datetime`, `array`, `image`, `number`), with an optional `transform`, static/per-row cell classes, and `hidden` columns. Every column header can carry a filter popover (text/number inputs per type) and a three-state sort control (ascending → descending → none). In local mode the component fetches the full dataset once and paginates/sorts/filters client-side; in server mode it sends `TableDataRequest` objects to the `dataSource` on every state change (debounced for filters) and reflects `TableDataResponse` pagination without re-deriving it, with loading, error+Retry, and empty states handled. A demo page in `app/` renders two instances — one per mode — against a small mock dataset proving the whole feature in the running app.

## User Stories

### Rendering

1. As a developer, I want to define columns declaratively in a `TableConfig` rather than hand-writing table markup, so that any dataset can be shown as a table with minimal code.
2. As a developer, I want each column to declare a `type`, so that the component picks the right renderer instead of me writing it per cell.
3. As a user, I want `text` cells rendered as plain strings, so that names, labels, and descriptions display naturally.
4. As a user, I want `date` cells formatted as a short human-readable date (e.g. `Jun 12, 2023`) inside a native `<time>` element, so that dates are legible and machine-readable.
5. As a user, I want `datetime` cells formatted with date and time (e.g. `Nov 2, 2024, 2:20 PM`) inside a native `<time>` element, so that timestamps are legible and machine-readable.
6. As a user, I want `array` cells rendered as a comma-joined list, so that tags and multi-value fields read as one value.
7. As a user, I want `image` cells rendered as a small rounded thumbnail with an accessible name derived from the row's name column, so that avatar/logo columns render compactly and accessibly.
8. As a user, I want `number` cells rendered as plain left-aligned numbers without forced separators or decimals, so that raw values are never mangled.
9. As a developer, I want a `transform` function per column that runs before type rendering, so that I can reshape raw values (e.g. enums → labels) for display.
10. As a developer, I want a static `class` and a per-row `dynamicClass` per column merged onto the cell, so that I can style cells (e.g. status colors) without editing the component.
11. As a developer, I want a `hidden` flag per column that drops the column entirely, so that I can hide columns without reworking my dataset.
12. As a user, I want empty cell values (`null`/`undefined`, any type) rendered as a muted em-dash, so that missing data is visible but unobtrusive.

### Filtering

13. As a user, I want to open a filter popover from a filter icon beside each column header, so that I can narrow rows without losing the header layout.
14. As a user, I want a text input in the popover for `text`, `array`, `date`, and `datetime` columns, so that I can type a filter value.
15. As a user, I want a number input in the popover for `number` columns, so that I can type a numeric filter value.
16. As a user, I want text and array filters to match case-insensitively on containment, so that partial matches find what I'm looking for.
17. As a user, I want date, datetime, and number filters to match exactly, so that I can pinpoint a specific value.
18. As a user, I want to close the popover with Escape (returning focus to the trigger), so that keyboard users can dismiss it cleanly.
19. As a user, I want each filter input labelled `Filter by <Column>`, so that screen readers announce which column I'm filtering.
20. As a developer, I want `filterable` on a column to be required before a filter control appears, defaulting to `false`, so that filtering is opt-in.
21. As a user, I want to clear a filter and have the column removed from the active filters (the request simply omits it), so that clearing and re-filtering behave consistently.
22. As a user, I want image columns to never show a filter control, and setting `filterable` on one to yield zero results, so that image columns can't be filtered incoherently.

### Sorting

23. As a user, I want to click a sortable column header to cycle ascending → descending → none, so that I can order rows with one control.
24. As a user, I want clicking a different sortable column to start that column ascending and clear the previous sort, so that only one column sorts at a time.
25. As a user, I want the sorted header to carry an arrow indicator and `aria-sort`, so that the current sort is visible and announced.
26. As a developer, I want `sortable` on a column to gate sortability in both modes, defaulting to `false`, so that sorting is opt-in.
27. As a developer, I want `sortable` to act as the server-mode request key only, while local sorting always reads `row[columnKey]`, so that custom sort keys never corrupt client-side comparison.
28. As a user, I want numbers sorted numerically, dates/datetimes chronologically, and text/arrays case-insensitively, so that ordering matches the column type.
29. As a user, I want empty values to sort last in both directions, so that blanks never jump to the top.
30. As a user, I want sorting to be stable, so that equal keys keep their original order.

### Pagination

31. As a user, I want a pager showing the current page among the total pages with prev/next and page buttons, so that I can move through large datasets.
32. As a user, I want the pager to show "Showing X–Y of Z" style result summaries, so that I always know where I am in the dataset.
33. As a user, I want the currently selected page marked with `aria-current="page"` and prev/next natively disabled at the ends, so that the pager is screen-reader friendly.
34. As a developer, I want an optional `pagination: { page?, size? }` in the `TableConfig` (defaults 1/10) used as the initial page and size in both modes, so that consumers can start anywhere.
35. As a user, I want changing the page size to be reflected by the pager, so that I can choose how many rows I see.
36. As a developer, I want every server-mode request to carry the current `pagination`, so that the `dataSource` knows what page to return.

### Server mode

37. As a developer, I want `dataSource` called on mount and immediately on pagination and sort changes in server mode, so that the server always serves the current view.
38. As a developer, I want filter changes debounced (~300ms) before hitting `dataSource`, so that typing doesn't spam the server.
39. As a developer, I want filter and sort changes to reset the page to 1, so that the view never lands past the end of a filtered result set.
40. As a user, I want the previous rows to stay visible (dimmed) with a subtle spinner while new data loads, so that the table doesn't jump or blank out.
41. As a user, I want a loading failure to show a neutral message with a Retry button that re-fires the last request, so that I can recover without reloading the page.
42. As a user, I want zero rows with no active filters to show "No data yet", so that an empty dataset is explained.
43. As a user, I want zero rows with active filters to show "No results match your filters" with a Clear filters action, so that I can recover from a bad filter.
44. As a developer, I want out-of-order responses dropped via a monotonic request id and effect cleanup, so that stale data never overwrites newer results.
45. As a developer, I want the component to mirror the response's `pagination` without re-deriving or clamping it, so that the server owns page math.

### Local mode

46. As a developer, I want `dataSource` called exactly once for the full dataset in local mode, so that the component can do all work client-side.
47. As a user, I want filtering, sorting, and pagination to apply instantly in local mode without extra fetches, so that small datasets feel snappy.

### Accessibility

48. As a screen-reader user, I want the table rendered as a native `<table>` with `<caption>`, `<thead>`, `<th scope="col">`, and `<tbody>`, so that the structure is announced correctly.
49. As a screen-reader user, I want each sort header to expose `aria-sort="ascending" | "descending"` on exactly the one sorted column, so that the current sort is always known.
50. As a screen-reader user, I want sort controls to be real `<button>`s containing the column title as their accessible name, so that they are reachable and labeled without custom wiring.
51. As a screen-reader user, I want filter results and page summaries announced in a single polite `role="status"` region, so that changes are announced without interrupting.
52. As a screen-reader user, I want the pager wrapped in a `<nav aria-label="Pagination">` landmark, so that I can jump to it.

### Developer ergonomics

53. As a developer, I want the `Table`, `TableConfig<T>`, `TableColumn<T>`, `TableColumnType`, `TableDataRequest`, `TableDataResponse<T>`, `dataSource`, and `serverSide` terms documented in the project glossary, so that the vocabulary is consistent across the codebase.
54. As a developer, I want the component and its config in one file (`components/Table.tsx`) with exported types, so that consumers import a single module.
55. As a developer, I want the component to be a client component following the existing neutral + dark-mode Tailwind styling, so that it matches the rest of the app.
56. As a developer, I want a demo page that renders the component in both server and local modes against a small mock dataset, so that the feature is proven in the running app.

## Implementation Decisions

- **Component contract**: A client component (`"use client"`) `Table` in `components/Table.tsx` accepting a single `TableConfig<T>`. The config, column, type, request, and response types are exported from the same file.
- **Config shape**: `TableConfig<T>` holds `dataSource`, `columns` keyed by unconstrained string (`Record<string, TableColumn<T>>`), the `serverSide` flag, and optional `pagination: { page?: number; size?: number }` defaulting to page 1, size 10 (local mode reads size from it too).
- **Column shape**: `TableColumn<T>` carries `type` (`text` | `date` | `datetime` | `array` | `image` | `number`), optional `transform`, optional `class`/`dynamicClass`, optional `hidden`, and `sortable`/`filterable` (both default `false`, values are the server-mode request keys).
- **Rendering contract (per ticket 02)**: `text` plain; `date` via `Intl.DateTimeFormat("en-US", { year, month: "short", day })` in `<time dateTime>`; `datetime` adds `hour`/`minute`; `array` as `value.join(", ")`; `image` as `h-10 w-10 rounded-lg shadow-sm` `<img>` with alt from the row's name column + `" thumbnail"` (or empty alt); `number` as plain left-aligned `String(value)`. `transform` runs before type rendering; `class` and `dynamicClass` merge onto the cell; `hidden` drops the column. Empty values render `—` in `text-neutral-400`.
- **Filtering (per ticket 03)**: A popover off a filter-icon button beside each header (disclosure pattern — `aria-expanded`/`aria-controls`, Escape closes, focus returns). Widgets: text input for `text`/`array`/`date`/`datetime`, number input for `number`, none for `image`. Matching: `text`/`array` contains case-insensitive; `date`/`datetime`/`number` exact; `image` with `filterable` set yields zero results. `TableDataRequest.filters` is `Record<string, string | number | (string | number)[]>`; the UI emits scalars only and omits cleared keys.
- **Sorting (per ticket 04)**: Three-state header cycle asc → desc → none on the already-sorted column; a different sortable column starts ascending and clears the old header. `sortable` gates both modes but is only the server-mode request key; local sort always reads `row[columnKey]` with per-type comparators on raw values (numeric; chronological via `Date`; case-insensitive `localeCompare` with `sensitivity: "base"` for text; the joined string for arrays; text comparator for images). Empty values sort last in both directions; sort is stable.
- **Server lifecycle (per ticket 05)**: `dataSource` fires on mount; immediately on pagination/sort change; debounced ~300ms on filter change. Filter/sort changes reset page to 1. Loading keeps prior rows dimmed with a spinner in the `role="status"` region; error replaces the body with a neutral message + Retry re-firing the last request; empty differentiates "No data yet" vs "No results match your filters" + Clear filters (column-spanning row). Stale responses dropped via a monotonic request id plus a `useEffect` cleanup `ignore` flag (no AbortController). Every server request carries `pagination`; the component mirrors `TableDataResponse.pagination` (`total`, `size`, `page`, `totalPages`) without re-deriving/clamping; missing response pagination falls back to defaults. Local mode reuses the error/empty rendering (single mount call, no loading state).
- **Accessibility (per ticket 01)**: Native table markup + `<caption>`; `th scope="col"` with `aria-sort` on the one sorted header; sort control is a real button whose accessible name is the column title; filter inputs labelled `Filter by <Column>`; results summary in one `role="status"` region; pager as `<nav aria-label="Pagination">` with `aria-current="page"` on the current page and native `disabled` on prev/next.
- **Styling**: Tailwind v4 with the existing neutral palette and dark-mode classes, matching `AppLayout`.
- **Demo page**: An `app/` route rendering two `Table` instances — one `serverSide: true` (mock async `dataSource` honoring pagination/sort/filter) and one `serverSide: false` (small in-memory dataset) — covering a representative mix of column types.
- **Vocabulary**: The `Table` terms are already recorded in `CONTEXT.md`; they are kept as the spec settles.
- **No new ADR**: These are component-level, reversible decisions; the glossary carries the vocabulary.

## Testing Decisions

- **What makes a good test**: Test external behavior only — rendered cells, pagination/sort/filter outcomes, loading/error/empty states, and ARIA state — never internal state or private helpers. Prefer assertions on visible content and ARIA attributes (`aria-sort`, `aria-current="page"`, `role="status"`) over CSS classes; retain class assertions only where they encode user-visible behavior (e.g. dimmed loading rows).
- **Module tested**: `Table` as a single component-level seam (`components/Table.test.tsx`, Vitest + React Testing Library + jest-dom). The `dataSource` contract is the injection point: server mode is exercised with a mocked async `dataSource` (resolving `TableDataResponse` and asserting the `TableDataRequest` it receives), local mode with a synchronous full-dataset resolver. There is no e2e infrastructure, so the component boundary is the top of the test pyramid; the demo page is wiring only and is not in the seam.
- **Prior art**: `components/AppLayout.test.tsx` — same stack, mocked `next/navigation`, behavior-focused assertions. The Table tests follow its conventions.
- **Coverage to include**: each `TableColumnType` renderer (including transform, dynamicClass, hidden, and empty em-dash); filter popover open/close/label/clear; text contains vs exact number/date matching; three-state sort cycle and per-type orderings (empties last, stability); pagination defaulting and page navigation; server-mode mount/debounced-filter/page-reset-on-filter-sort, loading dim + spinner, error + Retry, "No data yet" vs "No results match your filters" + Clear filters, and stale-response dropping; local-mode single-fetch instant behavior; a11y attributes (`aria-sort`, `aria-current="page"`, `role="status"`, filter labels, pager landmark).

## Out of Scope

- Virtualization of large datasets.
- Multi-column sort — `TableDataRequest.sort` is single-key.
- Sticky or resizable columns.
- Row selection, cell editing/CRUD, CSV/export, URL-state sync.
- Multi-value (any-of) filter UI — the `filters` type supports arrays, but the UI path is deferred to a later effort.
- E2E/browser tests for the demo page.
- Wiring the component into pages other than the demo page.

## Further Notes

- `components/Table.tsx` already exists as an empty placeholder and is where the build lands; `components/Table.test.tsx` does not yet exist.
- The demo page lives in `app/` (e.g. a `table` route) rendering both modes; the exact dataset/columns graduate from the rendering (02) and filtering (03) decisions above.
- This spec supersedes the closed execution tickets `.scratch/table/issues/06-build-table-tests.md` and `07-demo-page.md`; the resolved research/prototype/grilling tickets 01–05 remain as decision history in `.scratch/table/map.md`.