# 02 — Select filter tracer bullet: TableFilterable union, kind inference, select kind end-to-end

**What to build:** A consumer declares `filterable: { kind: "select", options? }` on a column and the filter popover renders a real SelectField driven imperatively through a FieldHandle: picking an option activates the filter dot and summary chip and sends the option's scalar value under the resolved request key. The full TableFilterable discriminated union is introduced with all eight filter kinds typed (options only on select/multi-select, inputType only on input, key on every member) — kinds not yet rendered in this ticket keep falling back to the old bare input so nothing breaks. `filterable: true` infers the kind from the column's type, upgrading option columns from a text box to a select; the legacy `true`/string shorthands produce identical requests to before.

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] `TableColumn.filterable` accepts `string | boolean | TableFilterable`; the compiler rejects `options` on non-choice members and `inputType` on the select member
- [x] A select filter renders a SelectField in the popover, lists its Options (static or async, with Pending/Retry behavior inherited from Field), and sends the picked option's value as a scalar under the resolved key
- [x] Async filter options are typed as Option sources of filter scalars, not row values; cell-render options remain a separate prop
- [x] `filterable: true` on an option column renders a select; `text`/`number` columns still render the legacy input
- [x] Legacy `filterable: true` and string request keys produce byte-identical requests to before (existing tests pass unmodified)
- [x] Active-filter dot, summary-strip chip, clearing, and the debounced server-mode request all still work through the new path
