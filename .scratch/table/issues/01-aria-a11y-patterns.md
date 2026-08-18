# 01 — ARIA & a11y patterns for sortable/paginated tables

Type: research
Status: resolved
Blocked by: None

## Question

What ARIA roles, states, and patterns should the `Table` component use for: sortable column headers, filter controls (inputs/selects per column), and pagination controls? What does an accessible pattern for a sortable table header look like (`aria-sort`, button-in-th), and what are the screen-reader expectations for filter and pagination affordances?

Resolve by a `/research` subagent against high-trust primary sources (WAI-ARIA Authoring Practices, MDN, WCAG). Capture findings on a throwaway `research/<name>` branch with a context pointer from this ticket. Feed the concrete attribute/role list to the rendering (02) and build (06) tickets.

## Answer

Findings captured in `.scratch/table/research/aria-a11y-patterns.md` (via `/research` subagent, sources = WAI-ARIA APG, W3C ARIA 1.2, MDN, WCAG 2.2).

Concrete attribute/role list for the `Table` component:

- **Baseline**: native `<table>/<thead>/<tbody>/<th>/<td>` + `<caption>` — no explicit ARIA roles on native elements. Table is not a widget; only its inner controls are tab stops.
- **Sort headers**: `<th scope="col" aria-sort="ascending|descending">` on the one currently-sorted header (moved on sort change, never multiple). Sort control is a real `<button>` inside the `<th>` containing the column title as its name — no `aria-label`, no custom keyboard handling. Sort icons `aria-hidden="true"`. No focus management needed.
- **Filter controls**: each input/select named `Filter by <Column>` (visible `<label>` preferred, else `aria-label`). Client-side filtering needs no `aria-rowcount`/`aria-controls`. `aria-rowcount`/`aria-rowindex` (all rows) only if server-side pagination renders one page of rows (`-1` = unknown total). Filtered-result / page summary ("Showing X–Y of Z", "N results") goes in one `role="status"` region (implicit `aria-live="polite"`), updated on filter/page/sort change — never `assertive`.
- **Pagination**: `<nav aria-label="Pagination">` landmark; `aria-current="page"` on exactly the one current-page button; native `disabled` on prev/next (reserve `aria-disabled="true"` only if kept focusable, then suppress action in JS).
- **WCAG map**: 1.3.1, 4.1.2, 4.1.3 (ARIA22 status region), 3.2.2 (in-place filtering), 3.2.3 (stable pager position).

Feeds tickets 02 (rendering: `th scope`, sort button-in-th, `aria-sort`) and 06 (tests: assert `aria-sort`, `aria-current="page"`, `role="status"`).