# 10 — Sorting

**What to build:** Clickable column-header sorting. A sortable column header cycles ascending → descending → none when clicked; clicking a different sortable column starts that one ascending and clears the old sort. The sorted header carries a direction icon and `aria-sort`. Local-mode comparison always reads the raw row value at the column key (never the transformed display value) with per-type comparators — numeric, chronological for dates, case-insensitive for text and joined arrays — with empty values sorting last in both directions and the sort stable. `sortable` (default false) gates sortability in both modes and names the server-mode request key.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Clicking a sortable header cycles asc → desc → none, with `aria-sort` and a direction icon on the sorted header only.
- [ ] Clicking a different sortable column starts it ascending and removes the previous header's sort state.
- [ ] Local sort uses the raw value at the column key with per-type comparators (numeric; chronological; case-insensitive text/array), empties last in both directions, and is stable.
- [ ] A column without `sortable` shows no sort control; `sortable` values are reserved as the server-mode request key and never affect local comparison.
- [ ] Tests cover the three-state cycle, cross-column switching, each type's ordering, empties-last, and stability.