Status: ready-for-agent

# Table — Post-13 Refinements

## Problem Statement

The `Table` component is built and proven (server + local modes), but it has ergonomic and contract gaps. Filter popovers can only be dismissed with Escape or by toggling the trigger — clicking elsewhere leaves them open. `sortable`/`filterable` force a developer to name a request key even when it is identical to the column key, so enabling the feature is more verbose than it needs to be. There is no way to reload data on demand: no refresh affordance in the UI and no imperative way for a parent component to trigger one. The current page number is only distinguished by `aria-current` — visually it looks identical to every other page button. And `dataSource` may return a plain value or a Promise depending on the caller, so the contract is ambiguous and local mode silently blanks the table on a rejected fetch with no error or loading state. The user wants these six gaps closed: outside-click popover dismissal, `string | boolean` sortable/filterable, a refresh button, an imperative refresh handle, a visibly current page, and an always-async `dataSource` with proper local-mode loading/error states.

## Solution

Six targeted changes to the existing `Table` component. Filter popovers close when the user clicks anywhere outside them (Escape and focus-return kept). `TableColumn.sortable`/`filterable` accept `string | boolean` — `true` means "the request key is the column's own key". A refresh button appears in the top-right of the header above the table in server mode and re-fires the current request. The component exposes an imperative `TableHandle` (`{ refresh(): void }`) through its `ref` prop so a parent can trigger a reload in either mode. The current page number gets a distinct filled/inverted style. `dataSource` always returns a `Promise<TableDataResponse<T>>` in both modes; local mode gains the same loading spinner/dim and error + Retry states as server mode, and `loading` initializes `true` in both modes. All behavior stays behind the existing single component seam; the demo pages and tests are updated to the async contract.

## User Stories

### Popover dismissal

1. As a user, I want to close an open filter popover by clicking anywhere outside it, so that I can dismiss it without reaching for the keyboard or the trigger.
2. As a user, I want clicking a different column's filter trigger to close the currently open popover, so that only one popover is ever open at a time.
3. As a user, I want Escape to keep closing the popover and returning focus to the trigger button, so that keyboard dismissal keeps working exactly as before.
4. As a user, I want typing a filter value inside an open popover not to close it, so that the input only dismisses when I explicitly leave it.

### `sortable` / `filterable` as `string | boolean`

5. As a developer, I want `sortable`/`filterable` to accept `true`, meaning the request key is the column's own key, so that I can enable the feature without naming a redundant key.
6. As a developer, I want `sortable`/`filterable` to keep accepting a string as a custom request key, so that server-mode requests can still rename a key.
7. As a developer, I want `false`/omitted to keep disabling the feature, so that the existing opt-in default is unchanged.
8. As a developer, I want a column configured with `sortable: true`/`filterable: true` to send the column's own key in the server-mode request, so that the server receives the same key the client uses.
9. As a developer, I want the project glossary to document the `string | boolean` semantics, so that consumers know `true` means the column's own key.

### Refresh button

10. As a user, I want a refresh button on the table in server mode, so that I can reload the current data on demand.
11. As a user, I want the refresh button in the top-right of the header above the table, so that it is visible and discoverable without disturbing the table structure.
12. As a user, I want the refresh button to re-fetch the current view — same page, sort, and filters — so that reloading never loses my place.
13. As a user, I want the refresh button disabled while a request is in flight, so that repeated clicks cannot stack duplicate requests.
14. As a screen-reader user, I want the refresh button accessible and labelled "Refresh", so that I know what it does.
15. As a developer, I want the refresh button hidden in local mode, so that local consumers don't see a server-reload affordance.

### Imperative refresh

16. As a developer, I want to pass a `ref` to `Table` and receive a `TableHandle`, so that I can trigger a reload imperatively from a parent component.
17. As a developer, I want `TableHandle.refresh()` to re-fire the current request in server mode, so that a parent can refresh without user interaction.
18. As a developer, I want `TableHandle.refresh()` to re-fetch the full dataset in local mode, so that a parent can refresh local data too.
19. As a developer, I want the refresh button, the Retry action, and the ref handle to share one code path, so that reload behavior is consistent from every trigger.

### Current page visibility

20. As a user, I want the current page number visually distinct from the other page buttons, so that I can see where I am at a glance.
21. As a screen-reader user, I want the current page to keep `aria-current="page"`, so that my position is announced exactly as before.
22. As a user, I want the current-page style to follow the neutral + dark palette, so that it matches the rest of the app.

### Always-async `dataSource` with local-mode loading/error

23. As a developer, I want `dataSource` to always return a `Promise<TableDataResponse<T>>` in both modes, so that the contract is uniform and async by default.
24. As a developer, I want the local-mode single fetch to be promise-based, so that local and server modes behave identically at the boundary.
25. As a user, I want local mode to show a loading spinner on first load, so that the table never appears blank or janky.
26. As a user, I want local mode to dim the current rows and show a spinner when a refresh is in flight, so that the table doesn't blank out during a reload.
27. As a user, I want a failed local fetch to show the same "Couldn't load data" + Retry state as server mode, so that local failures are visible and recoverable.
28. As a developer, I want `loading` to initialize `true` in both modes, so that the initial fetch always has a loading state.

## Implementation Decisions

- **Module**: modify `components/Table.tsx` — the existing single-file client component with all types exported. No new modules.
- **Popover dismissal**: the filter popover attaches a document-level `pointerdown` listener while open; if the event target is outside both the trigger button and the popover, the popover closes. Escape-to-close and focus-return-to-trigger are kept. Typing inside the input does not dismiss it. Clicking another column's trigger is "outside" the first popover, so only one popover can be open.
- **`string | boolean` keys**: `TableColumn.sortable` and `TableColumn.filterable` become `string | boolean`. `true` enables the feature with the column's own key as the request key; a string enables it with that string as the request key; `false`/omitted disables it. The key resolver (`resolveRequestKey`) treats `true` as the column's own key. Existing truthiness gates (sort header, filter control, `aria-sort`) are unchanged since `true` is truthy. Backwards compatible with existing string-keyed configs.
- **Refresh button**: rendered in the top-right of a header row above the table — the caption and refresh button live in a `flex justify-between` container (title on the left, small icon button with `aria-label="Refresh"` on the right) rendered above the `<table>` rather than in a native `<caption>`. It is rendered only in server mode, is `disabled` while a request is in flight, and re-fires the current request without resetting the page.
- **Imperative handle**: `Table` accepts a `ref` prop (React 19 ref-as-prop, no `forwardRef`) and exposes `TableHandle = { refresh(): void }` via `useImperativeHandle`. `refresh()` shares one internal reload callback with the refresh button and the existing Retry path — a single reload token (merging the existing `retryToken`) that feeds both the server and local fetch effects. Server mode re-fires the current request; local mode re-fetches the full dataset.
- **Current page pager**: the active page button gets a filled/inverted neutral style (light and dark variants) overriding the shared pager class; `aria-current="page"` and click behavior are unchanged. All other page buttons keep their existing style.
- **Always-async `dataSource`**: `TableConfig.dataSource` becomes `(request: TableDataRequest) => Promise<TableDataResponse<T>>` in both modes; the local-mode synchronous branch is removed. `loading` initializes `true` in both modes; the dimmed-tbody and spinner conditions drop their `serverSide` guard; the early local-mode `return null` is removed; and local mode gains the server mode's error + Retry rendering.
- **Vocabulary**: `TableHandle` is recorded in the project glossary (`CONTEXT.md`); the `Table`, `TableColumn`, and `dataSource` entries are updated to match the new semantics. No new ADR — component-level, reversible decisions.
- **Demo pages**: the local demo's `dataSource` becomes async to satisfy the new contract; the server demo may adopt the ref handle to prove the imperative path.

## Testing Decisions

- **What makes a good test**: external behavior only — rendered content, ARIA state, and the `TableDataRequest`/`TableDataResponse` objects crossing the `dataSource` contract. Never internal state or private helpers. Prefer assertions on visible content and ARIA attributes over CSS classes, except where a class encodes user-visible behavior (e.g. the dimmed loading rows and the filled current-page style).
- **Module tested**: `Table` at the single existing component-level seam (`components/Table.test.tsx`, Vitest + React Testing Library + jest-dom). The `dataSource` contract remains the injection point: server-mode tests assert the `TableDataRequest` the mocked `dataSource` receives; the ref handle is tested by passing a ref object to `render` and invoking `refresh()`. No new seams.
- **Prior art**: `components/AppLayout.test.tsx` (same stack, behavior-focused assertions) and the existing 56-test `Table.test.tsx` suite, whose conventions this spec extends.
- **Coverage to include**: popover closes on outside `pointerdown` and on clicking another trigger, stays open while typing, Escape still closes and refocuses; `true`/string/`false` sortable/filterable mapping asserted on the request the mock `dataSource` receives; refresh button present in server mode and absent in local mode, disabled while loading, click re-fires the request; `ref.current.refresh()` re-fires in server mode and re-fetches in local mode; current-page button carries the filled style and `aria-current="page"`; all `dataSource` mocks become async; local-mode first-load spinner, dim + spinner on refresh, and the error + Retry recovery path.

## Out of Scope

- Virtualization, multi-column sort, sticky/resizable columns, row selection, cell editing/CRUD, export, URL-state sync, and the multi-value (any-of) filter UI — carried over from the superseded spec.
- Any change to sort/filter matching semantics, debounce timing, or filter/sort page-reset rules — unchanged by this spec.
- A refresh button in local mode — explicitly hidden by design (the imperative handle still works there).
- New test seams or e2e/browser tests for the demo pages.

## Further Notes

- This spec supersedes the previous `.scratch/table/spec.md`; the earlier decision history in `.scratch/table/map.md` remains intact, with the post-13 grilling round captured there.
- The changes are incremental: all existing tests must stay green except where they encode the old sync-`dataSource` or string-only-key behavior, which are intentionally superseded.