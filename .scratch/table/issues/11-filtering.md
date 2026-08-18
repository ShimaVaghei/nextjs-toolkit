# 11 — Filtering

**What to build:** Per-column filtering. A filter-icon button beside each header opens a popover (disclosure pattern — trigger has `aria-expanded`/`aria-controls`, Escape closes and returns focus to the trigger). The popover holds a labelled `Filter by <Column>` input: text input for `text`/`array`/`date`/`datetime`, number input for `number`, none for `image`. Matching is contains-case-insensitive for text/array and exact for date/datetime/number; an image column with `filterable` set yields zero results. Active filters live in a record keyed by column, cleared filters are omitted, and zero rows with active filters show "No results match your filters" with a Clear filters action.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Each `filterable` column header exposes a filter-icon trigger that opens a labelled popover with the per-type widget; Escape closes it and returns focus to the trigger.
- [ ] Text/array filters match case-insensitively on containment; date/datetime/number filters match exactly.
- [ ] `filterable`/`sortable` default to false; a `filterable` image column yields zero results.
- [ ] Clearing a filter removes its key from the active-filters record; the record accepts scalar values only.
- [ ] Zero rows with active filters render "No results match your filters" plus a Clear filters action that removes every filter.
- [ ] Tests cover popover open/close and focus return, per-type matching semantics, cleared-filter omission, the image zero-results rule, and Clear filters.