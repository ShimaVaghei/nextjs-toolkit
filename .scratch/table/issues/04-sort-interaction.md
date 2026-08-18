# 04 — Sort interaction & local-mode semantics

Type: grilling
Status: resolved
Blocked by: None

## Question

How does sorting behave in both modes?

- Header interaction: click cycles asc → desc → none? Indicator (`aria-sort`, arrow icon)?
- `sortable: string` as the request key; what happens to client-side sorting when a custom sort key is given (no matching local property)?
- Local-mode ordering rules: default comparator (string vs number vs date per `type`), case sensitivity, and how `transform` interacts with sorting.

Work via `/grilling` (and `/prototype` if a rough take helps). Record the decision; block the build (06) on it.

## Answer

Resolved via grilling.

- **Header click cycle**: three-state cycle on the already-sorted column — ascending → descending → none → ascending. Clicking a *different* sortable column drops the old sort and starts that column ascending (no `aria-sort` on the previous header). `none` maps to `aria-sort="none"` (the default for sortable-but-unsorted per 01); asc/desc map to `aria-sort="ascending"` / `"descending"`. Direction icon renders only while sorted.
- **`sortable` is the server-mode request key only**: `sortable` set (default `false` → not sortable) gates sortability in both modes, but local sorting always reads `row[columnKey]` — a custom sort key never reaches local comparison. Server mode sends `{ sort: { key: <sortable>, direction } }` in `TableDataRequest.sort`.
- **Local ordering rules**: comparison always uses the raw row value at the column key — never the `transform`ed display value (transform is render-only, per 02). Comparator per type: `number` numeric (`Number(raw)`); `date`/`datetime` chronological (`new Date(raw).getTime()`); `text` case-insensitive (`String(raw).localeCompare(b, undefined, { sensitivity: "base" })`); `array` compares the comma-joined string (as 02 renders), case-insensitive; `image` raw string via the text comparator. Empty values (`null`/`undefined`/empty string) sort **last** in both directions. Sort is **stable** (equal keys keep insertion order).