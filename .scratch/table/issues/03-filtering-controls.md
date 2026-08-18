# 03 — Filtering: controls + matching semantics

Type: grilling
Status: open
Blocked by: None

## Question

What do filter controls look like and how do they match?

- Where do controls live — per-column header inputs, a filter bar above the table, or a per-type widget in a tooltip/popover?
- What widget per `TableColumnType` (text input, date picker, multi-select for arrays/booleans)? What about `(string | number)[]` filter values — how does a multi-value filter arise?
- Matching semantics: contains/case-insensitive for text? exact for enums? range for numbers/dates?
- `filterable: string` as the request key; how an empty/cleared filter is represented in `TableDataRequest.filters`.

Work via `/grilling` (and `/prototype` if a rough UI helps). Record the decision; block the build (06) on it.