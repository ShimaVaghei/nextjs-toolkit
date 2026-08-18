# 03 — Filtering: controls + matching semantics

Type: grilling
Status: resolved
Blocked by: None

## Question

What do filter controls look like and how do they match?

- Where do controls live — per-column header inputs, a filter bar above the table, or a per-type widget in a tooltip/popover?
- What widget per `TableColumnType` (text input, date picker, multi-select for arrays/booleans)? What about `(string | number)[]` filter values — how does a multi-value filter arise?
- Matching semantics: contains/case-insensitive for text? exact for enums? range for numbers/dates?
- `filterable: string` as the request key; how an empty/cleared filter is represented in `TableDataRequest.filters`.

Work via `/grilling` (and `/prototype` if a rough UI helps). Record the decision; block the build (06) on it.

## Answer

Resolved via grilling.

- **Placement**: filter controls live in a **popover** triggered by a small filter icon button beside each column header. A11y additions over ticket 01: the trigger carries `aria-expanded` + `aria-controls` pointing at the popover; the control inside is labelled `Filter by <Column>`; Escape closes and focus returns to the trigger (disclosure pattern).
- **Widgets**: single-line text input for `text`, `array`, `date`, `datetime`; `<input type="number">` for `number`; **image** gets no widget.
- **Matching**: `text`/`array` → contains, case-insensitive; `date`/`datetime`/`number` → exact; `image` → not filterable, and setting `filterable` on an image column yields **zero results**. `filterable`/`sortable` default to `false` (unset → not filterable/sortable).
- **Request shape**: `TableDataRequest.filters` is `Record<string, string | number | (string | number)[]>`. This pass the UI emits only scalar values; arrays (any-of semantics) are reserved for a later multi-value filter feature the owner will add. A cleared filter is represented by **omitting the key** — presence in the record means active.