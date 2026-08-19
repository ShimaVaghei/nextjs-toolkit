# 11 — Filtering

**What to build:** Per-column filtering. A filter-icon button beside each header opens a popover (disclosure pattern — trigger has `aria-expanded`/`aria-controls`, Escape closes and returns focus to the trigger). The popover holds a labelled `Filter by <Column>` input: text input for `text`/`array`/`date`/`datetime`, number input for `number`, none for `image`. Matching is contains-case-insensitive for text/array and exact for date/datetime/number; an image column with `filterable` set yields zero results. Active filters live in a record keyed by column, cleared filters are omitted, and zero rows with active filters show "No results match your filters" with a Clear filters action.

**Blocked by:** 08

**Status:** resolved

- [x] Each `filterable` column header exposes a filter-icon trigger that opens a labelled popover with the per-type widget; Escape closes it and returns focus to the trigger.
- [x] Text/array filters match case-insensitively on containment; date/datetime/number filters match exactly.
- [x] `filterable`/`sortable` default to false; a `filterable` image column yields zero results.
- [x] Clearing a filter removes its key from the active-filters record; the record accepts scalar values only.
- [x] Zero rows with active filters render "No results match your filters" plus a Clear filters action that removes every filter.
- [x] Tests cover popover open/close and focus return, per-type matching semantics, cleared-filter omission, the image zero-results rule, and Clear filters.

## Answer

Built per-column filtering in `components/Table.tsx`, built TDD on top of the ticket 08/09/10 shell (tests written first, red, then green).

Rendered behavior: every `filterable` column header renders a filter-icon button (disclosure pattern — `aria-expanded`/`aria-controls` on the trigger, `aria-label="Filter <Label>"`, funnel SVG). Clicking it opens an absolutely-positioned popover under the header holding a labelled `Filter by <Column>` input: `type="text"` for `text`/`array`/`date`/`datetime`/`image`, `type="number"` for `number`. Escape closes the popover and returns focus to the trigger; the input autofocuses on open. Typing applies the filter live; an emptied input removes that column's key from the active-filters record (scalar-only `Record<string, TableFilterScalar>`; the new `TableFilterScalar = string | number` type is exported and `TableFilterValue` now derives from it — recorded in `CONTEXT.md`). Local-mode matching is AND across active filters: `text`/`array` contains case-insensitive (array as its joined value), `date`/`datetime`/`number` exact (date/datetime via a timezone-robust part comparison that treats date-only strings as local midnight, datetime exact to the second; number via numeric equality), `image` always matches zero rows. The pipeline now filters before sorting/paginating, so totals/pages/summary reflect the filtered set. Zero rows with active filters render "No results match your filters" plus a Clear filters button that empties the record; zero rows with no filters keep "No data yet".

Test seam as pre-agreed (component-level, `components/Table.test.tsx`): no trigger without `filterable`; popover open/close + Escape focus return + `aria-expanded`; text vs number input widget by type; per-type matching (text/array contains-case-insensitive, number exactness incl. prefix rejection, date part matching incl. a `Date`-instance vs date-string row, datetime exact incl. second-level rejection, image zero-results); cleared-filter restoration; cross-column AND; "No results match your filters" + Clear filters. 13 new tests, 46 total in the file; full suite 131 green, typecheck clean, lint 0 errors (existing `no-img-element` warning only). Reviewed via `/code-review` — flagged datetime second-level exactness and timezone-fragile date matching, both fixed with `toMatchDate` + a seconds comparison, plus the `TableFilterScalar` type and `containsCaseInsensitive` dedup.