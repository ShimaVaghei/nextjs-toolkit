# 02 — Filter summary strip (chips + Clear all)

**What to build:** When at least one filter is active and the new `filterSummary` config flag is not `false`, a summary strip renders above the table. It lists each active filter — derived from the immediate filters state, in column order — as a `label: value` chip. Each chip has a remove (×) button that clears only that column through the existing filter-update path (so server-mode debounce and page-reset behaviour are preserved); a "Clear all" button clears every filter. The strip disappears when no filters are active, and `filterSummary: false` hides the strip while keeping the per-column trigger dots. Accessible names are provided for the remove and Clear all buttons. Glossary entries are added for `filterSummary` and for "active filter".

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] A strip appears above the table listing each active filter as `label: value` when filters are active and `filterSummary` is not `false`
- [ ] Chips are ordered like the columns
- [ ] A chip's remove button clears only that column's filter; server-mode debounce and page reset behave like any other filter change
- [ ] "Clear all" clears every filter
- [ ] The strip is absent when no filters are active
- [ ] `filterSummary: false` hides the strip but keeps the per-column dots
- [ ] Remove and Clear all buttons have accessible names; strip content is understandable to screen readers
- [ ] Tests assert the above through rendered output only, reusing existing local-filter test patterns
- [ ] Glossary updated with `filterSummary` and "active filter"