Label: wayfinder:map

## Destination

A working, tested, reusable `Table` component in `components/Table.tsx` — dual-mode (server/local) pagination, sorting, and filtering driven by `TableConfig<T>` — plus a demo page in `app/` proving both modes.

## Notes

- Domain: React 19 / Next.js 16 App Router; the component is a client component (`"use client"`). Styling follows `AppLayout` (Tailwind v4, neutral palette + dark mode). Tests are vitest + React Testing Library + jest-dom, matching `AppLayout.test.tsx`.
- Vocabulary (record in `CONTEXT.md`): `Table`, `TableConfig<T>`, `TableColumn<T>`, `TableColumnType` ('text' | 'date' | 'datetime' | 'array' | 'image' | 'number'), `TableDataRequest`, `TableDataResponse<T>`, `dataSource`, `serverSide`. The component and config keep the file `Table.tsx` (one component per file, named after it).
- Decisions locked in charting: local mode (`serverSide: false`) calls `dataSource` once for the full set, then filters/sorts/paginates client-side; column keys are unconstrained strings (`Record<string, TableColumn<T>>`); the request/response types are `TableDataRequest` / `TableDataResponse<T>`.
- Sessions: claim a ticket (set `Status: claimed`) before work; never resolve more than one non-research ticket per session; consult `docs/agents/issue-tracker.md` for the file conventions.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [01 — ARIA & a11y patterns for sortable/paginated tables](.scratch/table/issues/01-aria-a11y-patterns.md) — Use native table markup + `<caption>`; sort = `<button>` in `<th scope>` with `aria-sort` on the one sorted header; filters labelled `Filter by <Column>`, results in a `role="status"` region; pager = `<nav aria-label="Pagination">` with `aria-current="page"` and native `disabled`. Full detail + cited sources in `.scratch/table/research/aria-a11y-patterns.md`.

- [02 — Cell rendering per column type](.scratch/table/issues/02-cell-rendering-per-type.md) — Plain & native take (with B's image + empty): `text` plain; `date`/`datetime` via `Intl` in `<time>`; `array` comma-joined; `image` `h-10 w-10 rounded-lg` with name-based `alt`; `number` plain string; empties render `—` in `text-neutral-400`; `transform` before type rendering, `class`/`dynamicClass` merged on the cell, `hidden` drops the column. Prototype captured on branch `prototype/table-cell-rendering`.

- [03 — Filtering: controls + matching semantics](.scratch/table/issues/03-filtering-controls.md) — Filters live in a popover off a filter-icon button beside each header (trigger gets `aria-expanded`/`aria-controls`, Escape closes, focus returns). Widgets: text/array/date/datetime → text input; number → number input; image → not filterable (returns zero results if `filterable` set). Matching: text/array contains-case-insensitive; date/datetime/number exact. `filterable`/`sortable` default `false`. `filters` is `Record<string, string | number | (string | number)[]>`; UI emits scalars only; a cleared filter is omitted from the record.

- [04 — Sort interaction & local-mode semantics](.scratch/table/issues/04-sort-interaction.md) — Three-state header cycle asc → desc → none (aria-sort follows); a different column starts ascending and clears the old header. `sortable: string` is the server-mode request key only — local sort always reads `row[columnKey]`, gated on `sortable` being set. Local comparator per type on raw values (`transform` never affects sort): number numeric, date/datetime chronological, text/array/image case-insensitive string (array as its joined form); empties sort last in both directions; stable.

## Not yet specified

- The exact demo-page composition (which columns/data it exercises) is not ticketable until the rendering, filtering, sorting, and lifecycle tickets resolve. One patch of fog that should graduate into ticket 07's shape or into the build.

## Out of scope

- Virtualization — not requested; the frontier stops before it.
- Multi-column sort — the `TableDataRequest.sort` shape is single-key.
- Sticky/resizable columns — not requested.
- Row selection, cell editing/CRUD, export, URL-state sync — surfaced during charting and not confirmed in scope.
- Multi-value filter UI (any-of arrays) — the `filters` type supports it, but the UI path is deferred to a later effort by the owner.
