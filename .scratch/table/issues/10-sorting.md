# 10 — Sorting

**What to build:** Clickable column-header sorting. A sortable column header cycles ascending → descending → none when clicked; clicking a different sortable column starts that one ascending and clears the old sort. The sorted header carries a direction icon and `aria-sort`. Local-mode comparison always reads the raw row value at the column key (never the transformed display value) with per-type comparators — numeric, chronological for dates, case-insensitive for text and joined arrays — with empty values sorting last in both directions and the sort stable. `sortable` (default false) gates sortability in both modes and names the server-mode request key.

**Blocked by:** 08

**Status:** resolved

- [x] Clicking a sortable header cycles asc → desc → none, with `aria-sort` and a direction icon on the sorted header only.
- [x] Clicking a different sortable column starts it ascending and removes the previous header's sort state.
- [x] Local sort uses the raw value at the column key with per-type comparators (numeric; chronological; case-insensitive text/array), empties last in both directions, and is stable.
- [x] A column without `sortable` shows no sort control; `sortable` values are reserved as the server-mode request key and never affect local comparison.
- [x] Tests cover the three-state cycle, cross-column switching, each type's ordering, empties-last, and stability.

## Answer

Implemented clickable column-header sorting in `components/Table.tsx`, built TDD on top of the ticket 08/09 shell (tests first, red, then green).

Rendered behavior: a sortable column header (button inside the `<th scope="col">`, label as its accessible name) cycles ascending → descending → none on click; clicking a different sortable column starts it ascending and clears the old header. The active header carries `aria-sort="ascending"|"descending"` (sortable-but-unsorted headers carry `aria-sort="none"`) plus an `aria-hidden` direction glyph (`↑`/`↓`) that renders only while sorted. Local-mode sorting reads the raw `row[columnKey]` value — never the `transform`ed display value — with per-type comparators: number numeric, date/datetime chronological (via the existing `toDate`), text and joined-array case-insensitive (`localeCompare` with `sensitivity: "base"`), image via the text comparator. Empty values (`null`/`undefined`/`""`/`[]`) sort last in both directions (the direction factor is applied only to non-empty comparisons, so negation never flips empties to the front); the sort is stable (equal keys keep insertion order). `sortable` (default `false`) gates sortability; server-mode request keys are reserved for ticket 12.

Tests in `components/Table.test.tsx` (AppLayout conventions): the three-state cycle with `aria-sort` + icon present/absent, cross-column switching (icon follows the active header), per-type ordering for number/date/text/array/image, raw-value-over-transform (a reversing `transform` cannot reorder the sort), empties-last in both directions with distinct values, and stability across asc/desc with tied keys. 11 new tests, 33 total in the file; full suite 118 green, typecheck clean, lint 0 errors (existing warnings only). Reviewed via `/code-review` — flagged gaps (icon assertion, transform/image coverage, `isSortEmpty` duplication, trailing newline) fixed in the same change.