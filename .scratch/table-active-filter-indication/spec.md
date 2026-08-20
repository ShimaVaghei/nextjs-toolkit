Status: ready-for-agent

# Table: active-filter indication

## Problem Statement

When a table has filters applied, it is not clear which `TableColumn`s are filtering the rows. The only signal today is a subtle tint change on the funnel icon in the header — easy to miss, and it tells you nothing about what value is applied. Removing a single filter requires opening the filter popover and clearing the input, and the "Clear filters" action only appears in the empty state. Users need a way to see, at a glance, which columns are filtered and with what values, and to clear individual filters quickly.

## Solution

The table gains two complementary signals driven by the immediate `filters` state:

1. A small filled dot on the filter trigger of every column that has an active filter, so the active columns are obvious from the header alone.
2. A summary strip above the table listing each active filter as a `label: value` chip with an individual remove (×) button, plus a "Clear all" button. The strip is hidden when no filters are active, and can be hidden entirely by the embedder via a new `filterSummary` config flag.

## User Stories

1. As a table user, I want to see which columns have an active filter at a glance, so that I understand why the rows shown are filtered.
2. As a table user, I want a visible dot on the filter trigger of each filtered column, so the active state is unmistakable without opening the popover.
3. As a table user, I want the trigger to keep its existing tint when active, so the new dot complements rather than replaces the current signal.
4. As a table user, I want to see the applied filter values in a summary strip above the table, so I know exactly what is filtering the rows.
5. As a table user, I want each summary chip to read `label: value`, so I can map a filter back to its column and see the value I typed.
6. As a table user, I want to remove a single filter from its chip's × button, so I don't have to open the popover to clear it.
7. As a table user, I want a "Clear all" button in the summary strip, so I can remove every filter at once even when rows still match.
8. As a table user, I want the summary strip to disappear when no filters are active, so the space isn't wasted.
9. As a table user, I want the dots and the strip to reflect filters immediately as I type — in server mode too — so the UI never lies about a value that is about to be applied.
10. As a screen-reader user, I want each chip's remove button and the "Clear all" button to have accessible names, so I can clear filters without a mouse.
11. As an embedder of `Table`, I want to hide the summary strip via `filterSummary: false`, so I can keep the compact header-only signal when the strip is not wanted.
12. As a table user, I want removing a filter to re-run the query in server mode and reset to page one, consistent with every other filter change.

## Implementation Decisions

- Add `filterSummary?: boolean` to `TableConfig`. It defaults to `true`; when set to `false`, only the summary strip is hidden — the per-column trigger dots remain.
- **Active filter** is defined as a key present in the immediate `filters` state (before the server-mode debounce), matching the behaviour of the existing trigger tint.
- The summary strip lists active filters in `visibleColumns` order, so the strip reads left-to-right with the header.
- A chip's label is the resolved column label (`column.label ?? columnKey`); its value is the raw stored `TableFilterScalar` rendered as text, exactly as typed.
- A chip's × calls the existing `updateFilter(key, undefined)` path; "Clear all" calls the existing `clearAllFilters()`. Both reuse the existing state flow, so server-mode debounce and page reset behave identically to typing/clearing in the popover.
- The trigger dot is a small filled circle absolutely positioned on the filter trigger button; the button becomes the positioning context (`relative`). It renders whenever the column's filter is active.
- The summary strip renders between the caption/header row and the `<table>` element, only when at least one filter is active and `filterSummary` is not `false`.

## Testing Decisions

- A good test asserts external behaviour only: the dot appears on filtered columns and not on unfiltered ones, chips render `label: value`, a chip's × clears only that column, "Clear all" clears every filter, `filterSummary: false` hides the strip while keeping dots, and the strip is absent when no filters are active. Tests must not reach into component state.
- The module tested is `components/Table.test.tsx`, via the existing `renderLocal` harness and the `Table local filter` describe block, which is the prior art for these tests.
- Existing patterns to reuse: `clickFilterTrigger`, `screen.getByRole("button", { name: ... })`, `toHaveAttribute`, `fireEvent`, and asserting on rendered text/classes via `expect(...).toBeInTheDocument()` / `toHaveClass`.

## Out of Scope

- Multi-value/array filters (arrays remain reserved in `TableFilterValue`).
- Type-aware formatting of chip values (dates, numbers) beyond the raw typed scalar.
- Distinguishing "dirty" from "applied" filters during the server-mode debounce window.
- Server-side rendering of the strip or any SSR-specific behaviour.
- Keyboard shortcuts for clearing filters.

## Further Notes

- `CONTEXT.md`: add a glossary entry for `filterSummary` and note that an "active filter" is a column whose key is present in the `filters` record with a defined value.
- No ADR is warranted: the feature is small, reversible, and gated by an opt-out config flag.
- The empty-state "Clear filters" action remains as-is; "Clear all" in the strip complements it rather than replacing it.