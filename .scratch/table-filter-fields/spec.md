# Spec: Table filters render Field components

Status: ready-for-agent

## Problem Statement

A table column's filter is currently a hand-rolled popover with a bare text/number input. It cannot express the filterable domain: an `option` column filters by typing raw text instead of picking from its options, date columns get a text box, ranges are inexpressible, and there is no way to load filter choices asynchronously. The `filterable` prop type (`string | boolean`) cannot describe any of this, so each new filter capability would mean more ad-hoc props on `TableColumn`.

## Solution

Replace the hand-rolled filter input with actual **Field** components inside the filter popover, one per **Filter kind**. `TableColumn.filterable` becomes `string | boolean | TableFilterable`, a discriminated union on `kind` over the eight filter kinds. Where Options come from is expressed with a new shared `FieldOptionSource<T>` vocabulary, used both by Field's choice configs and by filter configs. The legacy shorthands keep working unchanged; `filterable: true` infers the filter kind from the column's type (option columns upgrade from a text box to a select). The wire contract stays scalar-based: a range filter emits two separate scalar entries under its two Filter keys.

## User Stories

1. As a table consumer, I want to declare `filterable: { kind: "select" }` on an option column, so that users filter by picking from labeled options instead of typing values.
2. As a table consumer, I want to declare `filterable: { kind: "date-range", key: { from: "startDate", to: "endDate" } }`, so that the backend receives two ordinary scalar filters it already understands.
3. As a table consumer, I want to pass async options to a select filter, so that filter choices can come from an API.
4. As a table consumer, I want `filterable: true` to keep working exactly as before, so that existing tables need no migration.
5. As a table consumer, I want `filterable: "requestKey"` to keep working, so that request-key overrides survive the rework.
6. As a table consumer, I want `filterable: true` on an option column to render a select, so that filtering matches how the column actually renders values.
7. As a table consumer, I want the compiler to reject `options` on a date filter and `inputType` on a select filter, so that misconfigurations never reach runtime silently.
8. As a table consumer, I want a range filter with only a string key to send `"<key>.from"`/`"<key>.to"`, so that I don't have to spell out both bounds' keys for the common case.
9. As a table consumer, I want a range filter with no key to send `"<columnKey>.from"`/`"<columnKey>.to"`, so that the column key remains the sensible default.
10. As a table consumer, I want a range filter's `{ from, to }` keys used verbatim, so that backend key naming is fully under my control (no invented suffixes).
11. As a table consumer, I want two range columns without explicit keys to be documented as a collision footgun, so that I know to name keys rather than debug silent overwrites.
12. As a table consumer, I want cell-render `options` and filter `options` to be separate props, so that changing filter choices never changes how cells resolve their labels.
13. As a table consumer, I want filter option values typed as filter scalars (string | number), so that what I write matches what actually goes over the wire, not the row type.
14. As a table consumer, I want multi-select filters to send an array of scalars, so that multi-value filtering reuses the existing filters-record shape.
15. As a table user, I want the filter popover to show Field behaviors I already know — placeholder, pending state while options load, rejected state with Retry, chips for multi-select — so that filters feel like every other form control in the toolkit.
16. As a table user, I want an active filter to keep showing its dot on the column trigger and its chip in the summary strip, so that filter visibility is unchanged.
17. As a table user, I want clearing a filter (Clear action or removing the chip) to omit it from the next request, so that cleared filters don't linger on the wire.
18. As a table user, I want to filter number columns by number, so that numeric comparisons behave as before.
19. As a toolkit maintainer, I want the Field choice configs' inline options union replaced by the shared `FieldOptionSource` type, so that "where Options come from" has one name across the codebase.
20. As a toolkit maintainer, I want textarea and checkbox excluded from the filter kinds, so that the type system itself documents what a filter can be.
21. As a toolkit maintainer, I want the table to own the filters record and drive Fields imperatively through FieldHandles, so that there remains exactly one source of truth for filter state.
22. As a future reader, I want the glossary to record that filters render real Field components driven imperatively through FieldHandles, so that the architecture is discoverable from the domain docs.


## Implementation Decisions

- `TableColumn<T>.filterable` becomes `string | boolean | TableFilterable`; the legacy shorthands keep their current meaning (`true` = filter on with inferred kind and the column's own request key; string = request-key override; `false`/omitted = off).
- `TableFilterable` is a discriminated union on `kind` over the **Filter kind** set: `input`, `select`, `multi-select`, `date`, `datetime`, `date-range`, `datetime-range`, `number-range`. Textarea and checkbox are excluded. `options?: FieldOptionSource<TableFilterScalar>` is only on the select/multi-select members; `inputType?: TableFilterInputType` (a `"text" | "number"` alias) is only on the input member; every member takes an optional `key?: string | { from: string; to: string }`.
- `FieldOptionSource<T> = FieldOption<T>[] | (() => Promise<FieldOption<T>[]>)` lives beside `FieldOption` in the Field's shared vocabulary module and replaces the inline union in `FieldChoiceConfig<T>.options` (pure refactor, no behavior change); Table imports it from the Field's public surface.
- Filter option values are `TableFilterScalar` (string | number) — the wire value — not the row type `T`.
- The filter popover renders real Field components (one per Filter kind, matching the wrapper-component-per-kind pattern), driven imperatively through `FieldHandle` (`setValue`/`getValue`). The Table keeps a single filters record as the source of truth; a change observed via `onValueChange` flows into the same debounced filter state as today.
- The kind is inferred from the column's `type` when `filterable: true`: `text` → input, `number` → input, `option` → select, `date`/`datetime` → the same-named kind. This is a deliberate behavior upgrade for option columns (text box → select).
- Filter-key resolution: string `key` = the single request key; `{ from, to }` = the two request keys for range kinds, used verbatim; omitted on a range kind = `"<key or columnKey>.from"`/`.to`; omitted otherwise = the column's own key. No `.from`/`.to` suffix is ever appended to explicitly provided keys. Two unnamed range filters colliding is a documented footgun, not a detected error.
- A range filter emits two scalar entries in the filters record (never a tuple); a multi-select filter emits an array of scalars; everything else emits a single scalar. `TableDataRequest.filters`' value type (`TableFilterScalar | TableFilterScalar[]`) is unchanged.
- Cell-render `options` on `TableColumn` remains a separate prop from the filter config's `options`.
- The hand-rolled filter popover's keyboard/pointer-outside handling and the active-filter dot survive; only its inner bare input is replaced by the Filter Field.
- The glossary terms added to `CONTEXT.md` during the grilling session (TableFilterable, Filter kind, Filter key, Filter Field, FieldOptionSource) are the canonical vocabulary for this work.

## Testing Decisions

- One seam: the public `Table` component rendered through React Testing Library, in the existing table test suite. No new seams; no direct unit tests of key-resolution helpers — everything is asserted through (a) the `filters` payload received by a mocked `dataSource` and (b) filter-popover DOM behavior.
- New coverage at that seam: each filter kind renders its Field; select filters send the picked option's value; multi-select filters send a scalar array; range filters send two entries under their resolved keys (explicit `{from, to}`, string-key default, and column-key default); async options show Pending then usable, and Retry after rejection; clearing omits the filter; the active dot and summary chip still appear; legacy `true`/string shorthands produce identical requests to before (existing tests must pass unmodified).
- Field internals (Pending/Rejected/Retry, chips, Clear) are already covered by the Field suite and are not re-tested here beyond their visible effect through the Table.
- Compile-time guarantees (discriminated union rejections) are enforced by the type system; a type-level test may assert that an invalid member errors, if the repo's test setup supports it — otherwise the union shape itself is the guarantee.

## Out of Scope

- Checkbox filters (tri-state UX) — deliberately excluded from Filter kind.
- Textarea filters.
- Detecting or warning about colliding default range keys across columns.
- Any change to `TableDataRequest`'s wire shape, sorting, pagination, or server/local mode semantics.
- Changes to Field components themselves beyond exporting the shared `FieldOptionSource` type.
- A migration/deprecation of the `string | boolean` shorthands — they stay.

## Further Notes

- The demo data and existing table tests continue to compile unchanged thanks to the shorthands; a follow-up could modernize demos to the new object form to showcase it.
- Docs updated during design: `CONTEXT.md` glossary (TableColumn, TableFilterScalar, FieldConfig entries plus new TableFilterable / Filter kind / Filter key / Filter Field / FieldOptionSource terms).
