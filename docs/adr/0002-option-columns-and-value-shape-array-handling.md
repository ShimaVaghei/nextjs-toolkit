# Option columns, value-shape array handling, and display-text coherence

## Decision

**The `array` TableColumnType is removed in favor of value-shape-driven array handling.** Rendering an array value as its elements joined with `", "` is a property of the *value's shape*, not of the column's renderer. Every Table renderer now joins array-valued display values with `", "` (element-wise mapped through the column's `options` when the type is `option`), so a plain list column needs only `type: "text"`.

**The `option` TableColumnType is added.** A column declares `options: FieldOption[]` (the same label + value vocabulary Field select/multi-select configs use, imported type-only from the Field module). Each cell's value is resolved strictly by `Object.is` identity against an option's `value`; a match renders the option's `label`, a non-match renders `String(value)`, and `null`/`undefined` keeps the empty-cell mark. A dev-mode `console.warn` fires when an `option` column has missing or empty `options` (once per column object), and rendering falls back to raw text. Options live on the column definition, not the table config, so two columns can map the same raw values to different labels. There is no per-column matcher override — users with object-valued options can use `transform` or store scalars in their rows.

**Sorting and local filtering on option (and array-valued) columns operate on the displayed text ("display-text coherence"):** sort compares the resolved label text, and local filtering matches the resolved label text case-insensitively. What the user sees is what sorts and filters. Type-specific `date`/`number` comparison branches keep precedence for their own types. Server mode is untouched — the `dataSource` owns filtering/sorting and receives raw values as before.

## Consequences

- This is a breaking change for column configs: existing `type: "array"` columns fail type-checking and must switch to `"text"` (or `"option"` with options). Rendering, sorting, and filtering behavior for those columns is fully preserved by the value-shape migration, so the fix is a string change.
- Unmatched option values degrade gracefully: a backend adding a new enum value before the options list updates renders the raw value instead of blanking cells.
- The `option` name mirrors the `options` prop it consumes and the glossary Options term (label + value), avoiding the visual implications of "tag"; styled chips remain out of scope.
