# Next.js Toolkit — Sidebar Navigation

The app's fixed left sidebar navigation and content area for hierarchical route structures, plus a reusable client-side table component for rendering tabular data.

## Language

**Route**:
A node in the navigation tree. Every Route has a `path` (string), `label` (string), and optional `children` (Route[]). Only leaf nodes (no children) trigger navigation.
_Avoid_: NavItem, MenuItem, Link

**Leaf node**:
A Route with no `children`. The only nodes that navigate the user when clicked.
_Avoid_: terminal, endpoint

**Full path**:
The concatenation of all ancestor `path` values from root to leaf, joined by `/`. This is the actual URL the user navigates to.
_Avoid_: resolvedPath, fullPath

**Level**:
Depth in the tree. Level 1 is top-level (always visible). Level 2 expands under a Level 1 click. Level 3 expands under a Level 2 click.
_Avoid_: depth, tier

**Collapsible section**:
A non-leaf Route whose children are hidden until clicked. Toggles open/closed with animation.
_Avoid_: expandable, toggleable

**AppLayout**:
A component that composes the navigation sidebar (rendered from Routes, seeded in `lib/routes.ts`) with the page content passed as `children`. The sidebar is pinned to the left and pushes the content to the right as it expands. Mounted in the root layout, so every page in the app lives inside it.
_Avoid_: SidebarLayout, AppShell, wrapper, frame

**Collapse**:
The state of the sidebar where only Level 1 is visible — no expanded panels. Clicking a leaf, clicking outside the sidebar on desktop, or closing the mobile overlay all return the sidebar to this state.
_Avoid_: reset, minimize, close

**Mobile overlay**:
The fullscreen navigation shown on mobile when the hamburger is opened. It shows one Level at a time (drill-down) with a Back icon in its header.
_Avoid_: drawer, modal, mobile menu

**Back icon**:
The mobile overlay header control that returns the user to the previous Level. It is hidden at Level 1, where only the close button is shown.
_Avoid_: back button, back chevron, previous

## Table terms

**Table**:
A reusable client-side component that renders tabular data with pagination, sorting, and filtering, driven by a `TableConfig`. It runs in one of two modes set by `serverSide`.
_Avoid_: DataTable, DataGrid, table view

**TableConfig**:
The configuration object passed to `Table`. It declares the `dataSource`, the `columns`, the `serverSide` mode, and an optional `pagination` (initial `page`/`size`, defaulting to 1/10).
_Avoid_: DataTableConfig, TableProps

**TableColumn**:
One column definition inside `TableConfig.columns`, keyed by a data property (or free string) and describing how that column renders, sorts, and filters. `type` picks a `TableColumnType` renderer; `sortable`/`filterable` may name a different request key.
_Avoid_: ColumnSpec, field config

**TableColumnType**:
The set of column renderers: `text`, `date`, `datetime`, `array`, `image`, `number`.
_Avoid_: cell kind, column variant

**TableDataRequest**:
The request object passed to `dataSource`: optional `pagination`, `sort`, and `filters`. `filters` values are `string | number | (string | number)[]`; a cleared filter is omitted from the record.
_Avoid_: DataGetRequest, query params

**TableDataResponse**:
The object `dataSource` must resolve: the row array plus a `pagination` summary (total, size, page, totalPages).
_Avoid_: DataGetResponse, page result

**dataSource**:
The function in `TableConfig` that resolves a `TableDataRequest` into a `TableDataResponse`. In server mode it is called for each state change; in local mode it is called once for the full dataset.
_Avoid_: fetcher, loadData, endpoint

**serverSide**:
The `TableConfig` flag choosing the mode. `true` sends pagination/sort/filter options to `dataSource` and trusts its response; `false` fetches all rows once and paginates/sorts/filters in the component.
_Avoid_: remote, async, mode
