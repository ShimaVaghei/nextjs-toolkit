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

**Route section**:
A labeled top-level grouping of Routes in `appRoutes` (type `RoutesSection`). Purely visual: the optional label renders as static text above its group — it cannot be clicked and never navigates. A section without a label renders no heading; an empty section renders nothing.
_Avoid_: nav group, category, menu section

**Collapsible route**:
A non-leaf Route whose children are hidden until it is clicked. Clicking it opens or closes only its own Drawer. (Renamed from "collapsible section" when Route section took the word.)
_Avoid_: folder, branch, collapsible section

**Drawer**:
The region that animates open directly beneath an expanded Collapsible route, showing its children indented under their parent. Any number of Drawers can be open at once; each toggles independently, and nothing else ever closes one.
_Avoid_: panel, flyout, submenu, dropdown

**AppLayout**:
A component that composes the fixed-width navigation sidebar (rendered from Route sections seeded in `lib/routes.ts`) with the page content passed as `children`. Page content never shifts — the sidebar keeps a constant width whether Drawers are open or not. On mount it opens the Drawers along the active route's ancestry; after that, Drawers are purely user-managed. Mounted in the root layout, so every page in the app lives inside it.
_Avoid_: SidebarLayout, AppShell, wrapper, frame

**Mobile overlay**:
The fullscreen navigation shown on mobile when the hamburger is opened. It renders the same accordion as the desktop sidebar. Its header shows the toggle button (in place of a static title), so closing happens from the same spot that opened it; Escape also closes it. Opening or closing it never changes which Drawers are open.
_Avoid_: drawer, drill-down, mobile menu

## Table terms

**Table**:
A reusable client-side component that renders tabular data with pagination, sorting, and filtering, driven by a `TableConfig`. It runs in one of two modes set by `serverSide`. A parent can trigger a reload through the imperative `TableHandle` exposed via the `ref` prop.
_Avoid_: DataTable, DataGrid, table view

**TableConfig**:
The configuration object passed to `Table`. It declares the `dataSource`, the `columns`, the `serverSide` mode, an optional `caption` rendered in a header above the table, an optional `pagination` (initial `page`/`size`, defaulting to 1/10), and an optional `filterSummary` flag controlling the summary strip.
_Avoid_: DataTableConfig, TableProps

**TableColumn**:
One column definition inside `TableConfig.columns`, keyed by a data property (or free string) and describing how that column renders, sorts, and filters. `type` picks a `TableColumnType` renderer; an optional `label` supplies the header text (defaulting to the column key); `sortable`/`filterable` are `string | boolean` — `true` enables the feature with the column's own key as the request key, a string enables it with a different request key, and `false`/omitted disables it.
_Avoid_: ColumnSpec, field config

**TableColumnType**:
The set of column renderers: `text`, `date`, `datetime`, `array`, `image`, `number`.
_Avoid_: cell kind, column variant

**TableDataRequest**:
The request object passed to `dataSource`: optional `pagination`, `sort`, and `filters`. `filters` values are `string | number | (string | number)[]`; a cleared filter is omitted from the record.
_Avoid_: DataGetRequest, query params

**TableFilterScalar**:
The scalar filter value a filter control can emit: `string | number`. The active-filters record accepts scalar values only; arrays are reserved for a later multi-value filter feature.
_Avoid_: filterValue, scalar

**Active filter**:
A filter applied to a `TableColumn`. A column's filter is active when its key is present in the `filters` record with a defined value — including values typed but not yet applied during the server-mode debounce window. An active filter is signalled by a dot on the column's filter trigger and by a chip in the summary strip.
_Avoid_: dirty filter, applied filter

**filterSummary**:
A `TableConfig` flag controlling the summary strip above the table. Defaults to `true`; set to `false` to hide the strip while keeping the per-column trigger dots. When shown, the strip lists each active filter as a `label: value` chip (in column order) with a remove button, plus a "Clear all" button.
_Avoid_: summaryStrip, filterChips, activeFiltersBar

**TableDataResponse**:
The object `dataSource` must resolve: the row array plus a `pagination` summary (total, size, page, totalPages).
_Avoid_: DataGetResponse, page result

**dataSource**:
The async function in `TableConfig` that resolves a `TableDataRequest` into a `TableDataResponse`, always returning a `Promise`. In server mode it is called for each state change; in local mode it is called once for the full dataset and again on refresh.
_Avoid_: fetcher, loadData, endpoint

**serverSide**:
The `TableConfig` flag choosing the mode. `true` sends pagination/sort/filter options to `dataSource` and trusts its response; `false` fetches all rows once and paginates/sorts/filters in the component.
_Avoid_: remote, async, mode

**TableHandle**:
The imperative handle a parent obtains from `Table` via the `ref` prop, exposing a single `refresh()` method. Calling it re-fires the current request in server mode or re-fetches the full dataset in local mode.
_Avoid_: refreshProp, onRefresh

## Form terms

**Field**:
A reusable client-side component that renders exactly one labeled form control, driven by a config object. The public API is nine components — InputField, TextareaField, CheckboxField, SelectField, MultiSelectField, DateField, DateTimeField, DateRangeField, DateTimeRangeField — one per Field kind; there is no generic `Field` export. A Field owns its value internally: the optional Initial value seeds it once at mount, every change is handled inside, and the parent observes changes via `onValueChange` and controls the value imperatively through `FieldHandle`. Validation feedback is managed inside the Field.
_Avoid_: FormControl, FormField, Input

**Field kind**:
The control variant a Field renders: `input`, `textarea`, `select`, `multi-select`, `checkbox`, `date`, `datetime`, `date-range`, or `datetime-range`. Expressed by which of the nine Field components is used — never declared in a config. An input Field narrows further by Input type. Where a kind's name coincides with a `TableColumnType` renderer name (`date`, `datetime`), they are different vocabularies: a kind fixes which labeled form control a Field renders; a column renderer only formats cell text in a Table.
_Avoid_: type, control type, variant

**Input type**:
The HTML-flavored subtype of an input Field: `text`, `password`, or `number`. Only meaningful when the Field kind is `input`; declared as `inputType`. Email checking is a Validator rule, not an input type.
_Avoid_: field type, html type

**Option**:
One choice offered by a select or multi-select Field: a display `label`, an unbounded `value` handed to the parent when chosen, and an optional `disabled` flag making it unselectable. Users always see labels; values are Matched against, never rendered directly.
_Avoid_: choice, item, entry

## Choice-kind terms

**Select**:
A single-choice Field kind rendered as a custom disclosure: a closed face showing either the placeholder or the selected Option's label, opening the shared searchable Options popup. Clicking a row selects its Option and closes the popup. Deliberately not a native `<select>`, so Option values can be any type without stringification.
_Avoid_: dropdown control, native select, combobox

**Options popup**:
The disclosure panel shared by select and multi-select: a search box filtering rows above a clickable row list. Opening moves focus to the search box; Escape, outside click, or focus genuinely leaving the widget closes it and resets the query — a row press that dissolves focus does not. In select, a row click picks and closes; in multi-select, a row click toggles membership and the popup stays open.
_Avoid_: dropdown list, options menu, picker

**Selection display**:
How a multi-select Field renders its selected Options inside the control, declared as `selectionDisplay`: `chips` or `text`, defaulting to `text`. `chips` lays out one removable Chip per selected Option, with a separate "Show options" button beside the strip opening the Options popup. `text` joins the labels into one comma-separated line that truncates with an ellipsis, the full string exposed via the native tooltip — and the whole strip itself is the disclosure trigger opening the Options popup, exactly like the select kind's closed face (no separate toggle button). Only exists on the multi-select kind.
_Avoid_: view mode, display mode, appearance

**Matching**:
The equality rule tying a value to an Option: reference identity (`Object.is`) by default, overridable per Field via `matchValue`. Matching drives the closed-face label, popup checkbox states, chip membership, and staleness detection.
_Avoid_: comparison, deep equal, lookup

**Fallback**:
The rendering of a value that Matches no Option once Options are authoritative: string/number values render their string form, anything else renders a generic "(unknown option)" marker. A Fallback is visible but inert — never choosable — and always accompanies a dev-only console warning.
_Avoid_: raw-value fallback, stale entry

**Chip**:
The removable pill a multi-select Field shows per selected Option when its Selection display is `chips`, laid out in a strip inside the control. The strip grows with the selection up to about three rows, scrolling internally past that. Each Chip removes its Option from the selection.
_Avoid_: tag, token, pill badge

**Pending**:
The state of a select or multi-select Field whose async Option load is in flight. Choosing is blocked (control disabled); any current selection stays visible.
_Avoid_: loading state, fetching, busy

**Rejected**:
The state of a select or multi-select Field whose async Option load failed. Choosing stays blocked and the Field offers Retry, which re-fires the load.
_Avoid_: error state, failure, crashed

**FieldConfig**:
The configuration object passed to a Field component. One kindless type per component — `FieldInputConfig`, `FieldTextareaConfig`, `FieldCheckboxConfig`, `FieldSelectConfig<T>`, `FieldMultiSelectConfig<T>` — with no `kind` property: the component fixes the kind, and the type narrows Initial, `onValueChange`, and Options to that kind's value shape (choice kinds carry T, the Option value type). Every config declares label, the optional Initial value, an optional `onValueChange` observer, an optional FieldValidator, and presentation props (hint, disabled, className). Only the input config adds `inputType`; choice kinds add Options (static array or async load) plus a `matchValue` override and `keepDisabledSelection`; every kind except checkbox adds `placeholder`. A prop a kind does not consume is absent from its type — rejected by the compiler, never silently ignored at runtime.
_Avoid_: FieldProps

**Initial value**:
The optional mount-time seed in a `FieldConfig`, read exactly once and ignored afterwards — undefined allowed, seeding nothing. A changed prop after mount draws a dev-only warning; live control flows only through user edits, `setValue`, and `onValueChange` observation.
_Avoid_: value, defaultValue, controlled value

**FieldValidator**:
The optional declarative rule set in a `FieldConfig`: `required`, numeric `min`/`max`, textual `minLength`/`maxLength`/`regex`, and input-only `email`. Each rule is either a bare constraint (built-in default message) or a `{ value, message }` pair (custom text). Rules apply by kind: `required` covers Empty values on every kind; `min`/`max` apply only to number inputs; `minLength`/`maxLength` apply to textarea and non-number inputs; `email` applies to non-number inputs only; `regex` applies to textarea and non-number inputs. A rule configured on a kind it does not fit is ignored, with a dev-only console warning naming the Field.
_Avoid_: rules, schema, validation config, Validator

**Placeholder**:
Muted hint text shown by a Field while it holds nothing: the native attribute on input and textarea kinds, the closed-face text on select, the empty chip strip's text on multi-select, the empty trigger-face text on the date kinds; checkbox has none. Purely visual — never choosable, hidden from assistive tech, and never affects the value or Empty detection.
_Avoid_: ghost, hint

**Empty**:
The value state `required` rejects, per Field kind: `""`, `null`, or `undefined` everywhere; plus `[]` for multi-select and `false` for checkbox (required = must-tick). Textual kinds test trimmed emptiness, so whitespace-only counts as Empty; the stored value itself is never altered.
_Avoid_: blank, missing, pristine

**Touched**:
Whether the user has left the control at least once (first blur). Errors stay hidden until a Field is Touched; afterwards every change re-evaluates the Validator.
_Avoid_: dirty, visited, interacted

**Error**:
The single validation message currently shown beneath the control, produced by the Validator once the Field is Touched (or forced). At most one Error shows at a time; fixing the value clears it immediately.
_Avoid_: errorMessage state, failure

**FieldHandle**:
The imperative handle a parent obtains from `Field` via the `ref` prop. `validate()` force-runs every rule regardless of Touched state, shows any resulting Error, and returns whether the value is valid — used at submit time. `getValue()` reads the current internal value; `setValue()` installs one through the same pipeline as a user edit (observer fired, Error re-evaluated when Touched).
_Avoid_: ref methods, validation API

**Calendar popup**:
The disclosure panel shared by the date, datetime, date-range, and datetime-range Field kinds: a month grid with day cells, navigation controls, and (for datetime kinds) time inputs. Opening moves focus to the selected day or today; Escape or outside click closes and returns focus to the trigger. The popup follows a draft-with-commit interaction: picks edit a draft state shown in the pane, Apply commits the draft to the Field's value, Cancel or Escape discards. Range kinds use two-step picking (anchor then complete) within the same popup; the popup stays open after the range is completed so the user can review and click Apply.
_Avoid_: date picker, calendar widget, date popup

**Month/year picker overlay**:
A panel that replaces the day grid inside a Calendar popup when the user clicks the header label. It allows navigating to any month and year without stepping through months one at a time. The overlay uses a stacked two-step flow: years first, then months. Clicking a year advances to the month panel; clicking a month sets the year+month and returns to the day grid immediately. The overlay always opens at the year panel regardless of prior state.
_Avoid_: month selector, year selector, date navigator

**Year panel**:
The first screen of the Month/year picker overlay. Displays a 12-year grid (one decade) with prev/next decade arrow buttons. The currently selected year is highlighted. Clicking a year advances to the Month panel.
_Avoid_: decade picker, year grid

**Month panel**:
The second screen of the Month/year picker overlay. Displays 12 months in a 3×4 grid. The currently selected month is highlighted. Clicking a month sets the year+month and returns immediately to the day grid.
_Avoid_: month selector, month grid

**Draft**:
The temporary value state inside a Calendar popup before Apply commits it. For single dates, the draft is the selected day (and time, for datetime kinds). For ranges, the draft accumulates across two clicks: first click anchors one end, second click completes the other. The draft is visible in the popup's summary pane and, while the popup is open, streamed to the parent (via onDraftPreview) so the trigger face previews it in place of the committed value — a preview only; the Field's value does not change until Commit. Closing the popup clears the preview and the face falls back to the committed value. Cancel or Escape discards the draft without changing the Field.
_Avoid_: pending value, staged value, uncommitted pick

**Commit**:
The action that lands a Calendar popup's draft into the Field's value, triggered by clicking Apply or pressing Enter on the Apply button. Commit normalizes the draft through the same pipeline as a user edit: the observer fires, Error re-evaluates when Touched, and the closed face updates. For datetime ranges, Commit ensures both ends carry complete instants (picking a date without a time seeds midnight).
_Avoid_: apply, confirm, save
