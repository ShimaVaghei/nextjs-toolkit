# 01 — Active-filter dot on column triggers

**What to build:** For every filterable column that has an active filter, the filter trigger in the column header shows a small filled dot, complementing the existing active tint. A filter is active when the column's key is present in the immediate filters state — including values typed but not yet applied during the server-mode debounce window. Clearing the filter (e.g. by blanking the popover input) removes the dot. Unfiltered and non-filterable columns show no dot.

**Blocked by:** None — can start immediately

**Status:** done

- [x] A dot appears on the filter trigger of a column whose filter is active
- [x] No dot appears on columns without an active filter, or on non-filterable columns
- [x] The dot appears while a value is typed but not yet applied (server-mode debounce window)
- [x] Clearing a column's filter removes its dot
- [x] The dot is decorative (aria-hidden) and existing trigger styling/tinting is preserved
- [x] Tests assert the above through rendered output only (no component-state access), reusing the existing local-filter test patterns