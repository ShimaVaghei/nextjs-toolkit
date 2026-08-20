# 15 — string | boolean sortable/filterable

**What to build:** `TableColumn.sortable` and `TableColumn.filterable` accept `string | boolean`. `true` enables the feature with the column's own key as the request key; a string enables it with that string as the request key; `false`/omitted disables it. Server-mode requests translate column keys to their request keys accordingly, and the existing truthiness gates (sort header, filter control, `aria-sort`) are unchanged.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] A column with `sortable: true` sends the column's own key as the sort request key in server mode.
- [x] A column with `filterable: true` sends the column's own key as the filter request key in server mode.
- [x] A string value still acts as a custom request key, exactly as before.
- [x] `false`/omitted still disables the feature — no sort control, no filter control.
- [x] Backwards compatible — existing string-keyed configs behave identically.
- [x] Tests at the Table component seam assert the request keys the mocked `dataSource` receives for `true`, string, and `false` values.