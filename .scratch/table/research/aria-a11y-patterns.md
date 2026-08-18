# Table — ARIA & accessibility patterns for sortable / filtered / paginated tables

Research for ticket `01-aria-a11y-patterns` (`.scratch/table/issues/01-aria-a11y-patterns.md`).
Every claim is traced to its owning primary source (WAI-ARIA APG, W3C ARIA 1.2, MDN, WCAG 2.2) in the **Sources** section.

---

## Recommendation

### 0. Baseline table semantics

- Use native HTML table markup — `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` — and a `<caption>` for the table's name. **Do not** add `role="table"`, `role="row"`, `role="columnheader"`, or `role="cell"` on native elements: HTML already maps these implicitly, and ARIA is only a supplement for missing host-language semantics. [S1] [S2]
- Give the table a name: a visible `<caption>` is the idiomatic choice (`aria-label`/`aria-labelledby` on the table are only needed if there is no caption). [S1]
- A table is **not** an interactive widget: its cells are not focusable. Each interactive control *inside* the table (sort button, filter input) is its own tab stop. This is expected; the sortable-header pattern is the one sanctioned way to put buttons in headers. [S1]

### 1. Sortable column headers

Exact pattern (mirrors the APG Sortable Table Example):

```html
<th scope="col" aria-sort="ascending">
  <button type="button">Last name<span aria-hidden="true">▲</span></button>
</th>
```

- **`aria-sort` goes on the `<th>`** (the `columnheader`), **not** on the button. Allowed values: `ascending` | `descending` | `other` | `none` (default when absent). [S3] [S4] [S5]
- **Apply `aria-sort` to only one header at a time.** On sort change, remove it from the previous header and set the new value on the newly sorted header. [S3] [S4] [S5]
- **The sort control is a real `<button>` inside the `<th>`.** This gives native button semantics, a tab stop, and Enter/Space activation "provided by browsers" — no custom keyboard handling and no `role="button"` needed. Keep the visible column title as the button's text content so it is the accessible name; **no `aria-label` is needed** on the button when it contains the column title. [S4] [S3] [S6]
- **Sort-direction icons**: mark the icon element `aria-hidden="true"` (and `focusable="false"` for SVG) so it is not concatenated into the button's accessible name; use an off-screen description of sort behavior on the `<caption>` rather than repeating a label on every button, to avoid verbosity. [S4]
- **Focus management**: none required. `aria-sort` is not focusable; it is a state announced when AT reaches the column header (and is read via table navigation). It does not affect the actual sort order — it only informs AT which column is sorted and in which direction. [S3] [S5]
- `aria-sort="none"` may be set explicitly on sortable-but-unsorted headers (it is the default). The APG example also uses a visually distinct "unsorted" icon; ensure that icon differs by more than color/size from the direction icons. [S5] [S4]

### 2. Per-column filter controls

- **Every filter input/select needs an accessible name.** Best: a visible `<label>` associated with the control, e.g. `Filter by <Column>` (native `<label>` satisfies 4.1.2 / technique H44). If no visible label is possible, name it with `aria-label="Filter by <Column>"` (or `aria-labelledby` pointing at the column header). [S6] [S7] [S8]
- **No `aria-controls`/`aria-rowcount` needed for client-side filtering**: the filter control does not need to reference the table, and as long as the full filtered row set stays in the DOM, `aria-rowcount`/`aria-colcount`/`aria-rowindex` are unnecessary. [S1] [S9]
- **`aria-rowcount`/`aria-rowindex` apply only when the DOM does not contain the whole table** — i.e. server-side pagination where only the current page of rows is rendered. Then: `aria-rowcount` = total number of rows (including the header row) on the `table`; `aria-rowindex` on **every** rendered row. (Value `-1` means "unknown total".) WARNING: inconsistent `aria-rowindex` can break screen-reader table navigation, so if used, it must be on all rows. `aria-colcount`/`aria-colindex` are only needed if columns are hidden/absent — not our case. [S9]
- **Result-count announcements — use a `role="status"` region.** Filtering the table in place is a *content change, not a change of context*, so it does not take focus. WCAG 4.1.3 Status Messages says the result *list itself* is not a status message, but brief text such as "18 results returned" **is** a status message and must be programmatically determinable. The sufficient technique is `role="status"` (ARIA22), which carries an implicit `aria-live="polite"` + `aria-atomic="true"`. [S10] [S11]
- Render the "Showing X–Y of Z" summary text inside an element with `role="status"` (equivalent to `aria-live="polite"`) and update its text when filter/page/sort changes. Never `aria-live="assertive"` for this — it interrupts. [S10] [S11] [S12]
- **3.2.2 On Input**: changing a filter's value must not cause a change of context (no navigation, no focus steal, no page reload) unless the user is warned. Filtering in place is compliant. [S13]

### 3. Pagination controls

```html
<nav aria-label="Pagination" class="…">
  <button type="button" disabled>Previous</button>
  <button type="button" aria-current="page">1</button>
  <button type="button">2</button>
  <button type="button">Next</button>
</nav>
```

- **Wrap the pager in `<nav>` with `aria-label="Pagination"`.** `<nav>` has the implicit landmark role `navigation`; when multiple `<nav>`s exist (site nav + pager), label each with `aria-label`/`aria-labelledby` to distinguish them (this is how MDN labels breadcrumbs: `<nav aria-label="Breadcrumb">`). [S14] [S15] [S16]
- **Current page → `aria-current="page"` on exactly one control** (the current page button/link). "Only mark one element in a set of elements as current." This is the documented breadcrumb/pagination usage of `aria-current`. [S17]
- **Disabled Previous/Next → use the native `disabled` attribute on the real `<button>`.** MDN: "When needing to disable native HTML form controls, developers will need to specify the `disabled` attribute, as it provides all of the generally expected features of disabling a control by default" (state + suppressed functionality). `aria-disabled="true"` only *exposes* the state and keeps the element **focusable** — use it only if you deliberately want the disabled prev/next to remain in the tab order for discoverability, in which case you must also suppress the action in JS and style it yourself (`[aria-disabled="true"]`). For the common case, native `disabled` is correct and simplest. [S18]
- **Page-number buttons** need no ARIA beyond their visible text; they're native buttons. If pagination navigates URLs instead, use links (`<a>`) — but this client-side Table uses buttons.
- **"Showing X–Y of Z"** is a status message → put it in the same `role="status"` (implicit `aria-live="polite"`) region described in section 2, updated on page/filter/sort change. [S10] [S11]
- **3.2.3 Consistent Navigation**: keep the pager in the same relative position/order whenever it appears (one pager per table here, so trivially met; note G61). [S19]

### 4. WCAG 2.2 map

| WCAG 2.2 SC | How the Table meets it |
|---|---|
| 1.3.1 Info and Relationships (A) | Native table markup + `th scope` (H51/H63); `<caption>`; `<nav>` landmark; labelled filter inputs (H44) [S16] [S20] |
| 4.1.2 Name, Role, Value (A) | Native `button` sort controls with content names; labelled filter inputs; native `disabled` state on pager buttons [S7] [S18] |
| 4.1.3 Status Messages (AA) | "Showing X–Y of Z" / "N results" in `role="status"` (ARIA22) [S10] [S11] |
| 3.2.2 On Input (A) | In-place filtering, no change of context [S13] |
| 3.2.3 Consistent Navigation (AA) | Stable pager placement/order [S19] |

---

## Sources

Primary sources only (W3C WAI-ARIA APG, W3C ARIA 1.2, MDN, WCAG 2.2 + its Understanding/Techniques docs). Each numbered source backs the corresponding `[S#]` references above.

- **[S1] APG — Table Pattern** (W3C WAI-ARIA Authoring Practices Guide 1.2)
  https://www.w3.org/WAI/ARIA/apg/patterns/table/
  Supports: native HTML `table` strongly encouraged over `role="table"`; a table is not an interactive widget, cells not focusable, widgets inside are separate tab stops; `aria-labelledby`/`aria-label` only if no caption; `aria-sort` set on the header cell of the sorted column.

- **[S2] W3C — ARIA 1.2, §1.4 Co-Evolution of WAI-ARIA and Host Languages** ("WAI-ARIA is intended to augment semantics... It is not appropriate to create objects with style and script when the host language provides a semantic element"; "use a host language feature that is as similar as possible")
  https://www.w3.org/TR/wai-aria-1.2/#co-evolution

- **[S3] MDN — `aria-sort`**
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-sort
  Supports: set `aria-sort` only on the currently sorted column/row; move it when sort changes; only one at a time; values `ascending`/`descending`/`none`(default)/`other`; "It doesn't have any impact on the actual sort order"; example markup `th aria-sort="ascending"><button>…`; icons added via CSS on `th[aria-sort=…]`.

- **[S4] APG — Sortable Table Example** (W3C)
  https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
  Supports: `aria-sort` on the `th` of the currently sorted column, moved on sort change; sortable header text wrapped in a `button`; icons via `aria-hidden="true"` `span` so they don't enter the button name; off-screen sort description on the caption instead of each button; keyboard interaction "provided by browsers"; visually distinct unsorted icon.

- **[S5] APG — Grid and Table Properties, "Indicating sort order with aria-sort"** (W3C)
  https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/
  Supports: `aria-sort` values table (`ascending`/`descending`/`other`/`none` = "Default (no sort applied)"); no way to indicate multi-key sort levels.
  Also supports `aria-rowcount`/`aria-rowindex`/`aria-colcount`/`aria-colindex` rules (see S9).

- **[S6] MDN — `aria-label`**
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label
  Supports: `aria-label` names elements when no visible name/label exists; prefer a visible label / `aria-labelledby` when available; a button's accessible name defaults to its text content; don't overuse.

- **[S7] WCAG 2.2 — SC 4.1.2 Name, Role, Value (Level A)** (normative text) + Understanding
  https://www.w3.org/TR/WCAG22/#name-role-value
  https://www.w3.org/WAI/WCAG22/Understanding/name-role-value
  Supports: all UI components need programmatically determinable name/role/state/value; standard HTML controls meet it when used per spec; techniques H91/H44/ARIA14/ARIA16; F68 = no programmatic name.

- **[S8] WCAG 2.2 — Technique H44** "Using label elements to associate text labels with form controls"
  https://www.w3.org/WAI/WCAG22/Techniques/html/H44
  (Cited in S7's sufficient techniques; also referenced under SC 1.3.1, S20.)

- **[S9] APG — Grid and Table Properties, "Using aria-rowcount and aria-rowindex" / "Using aria-colcount and aria-colindex"** (W3C)
  https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/
  Supports: `aria-rowcount` only when DOM rows ≠ total rows (e.g. large/paged data sets); `-1` = unknown; `aria-rowindex` required on every descendant row incl. header rows when `aria-rowcount` is used; explicit warning that missing/inconsistent `aria-rowindex` can break table navigation; `aria-colcount`/`aria-colindex` for hidden/absent columns.

- **[S10] WCAG 2.2 — SC 4.1.3 Status Messages (Level AA)** (normative text) + Understanding
  https://www.w3.org/TR/WCAG22/#status-messages
  https://www.w3.org/WAI/WCAG22/Understanding/status-messages
  Supports: status messages must be programmatically determinable without taking focus; the search *results list itself* is not a status message, but "18 results returned" / "5 results returned" IS; sufficient technique ARIA22 (`role="status"`); advisory guidance not to over-use live regions.

- **[S11] WCAG 2.2 — Technique ARIA22** "Using role=status to present status messages"
  https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22
  Supports: `role="status"` as the sufficient technique for result/action status messages under 4.1.3.

- **[S12] MDN — `aria-live`**
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live
  Supports: `polite` = announce at next graceful opportunity (don't interrupt current task); `assertive` = interrupt immediately — warning not to use unless imperative; a live region is set on an empty element and updated; it is not given focus.

- **[S13] WCAG 2.2 — SC 3.2.2 On Input (Level A)** (normative text) + Understanding
  https://www.w3.org/TR/WCAG22/#on-input
  https://www.w3.org/WAI/WCAG22/Understanding/on-input
  Supports: changing a control's setting must not cause a change of context unless advised; "a change of content is not always a change of context" — dynamic in-place updates (like filtering) are fine.

- **[S14] MDN — `<nav>` element**
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/nav
  Supports: `<nav>` = navigation section with **implicit ARIA role `navigation`** (no `role` permitted); multiple `<nav>`s should be labeled with `aria-labelledby`/`aria-label`; "A document may have several nav elements... aria-labelledby can be used to promote accessibility."

- **[S15] MDN — `aria-current` example** (breadcrumb markup `<nav aria-label="Breadcrumb">`)
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current
  Supports: labeling a `<nav>` landmark with `aria-label`; using `aria-current="page"` on the current element in breadcrumb/pagination-like sets.

- **[S16] WCAG 2.2 — SC 1.3.1 Understanding + Technique H97** "Grouping related links using the nav element"
  https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships
  https://www.w3.org/WAI/WCAG22/Techniques/html/H97
  Supports: landmarks (ARIA11/H101/ARIA13), table markup (H51), `th scope` (H63), and `<nav>` grouping as sufficient techniques for 1.3.1.

- **[S17] MDN — `aria-current`**
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current
  Supports: `aria-current="page"` for the current page in a set of pagination links; "Only mark one element in a set of elements as current"; values `page`/`step`/`location`/`date`/`time`/`true`/`false`.

- **[S18] MDN — `aria-disabled`**
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-disabled
  Supports: `aria-disabled="true"` only *exposes* disabled state and leaves the element **focusable**; for native form controls the `disabled` attribute "provides all of the generally expected features of disabling a control by default"; with `aria-disabled` you must suppress functionality in JS and style via `[aria-disabled="true"]` + forced-colors support.

- **[S19] WCAG 2.2 — SC 3.2.3 Consistent Navigation (Level AA)** (normative text) + Understanding
  https://www.w3.org/TR/WCAG22/#consistent-navigation
  https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation
  Supports: repeated navigational mechanisms must occur in the same relative order; sufficient technique G61.

- **[S20] WCAG 2.2 — SC 1.3.1 Info and Relationships (Level A)** (normative text) + Understanding
  https://www.w3.org/TR/WCAG22/#info-and-relationships
  https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships
  Supports: relationships conveyed by presentation must be programmatically determinable; table header/data-cell relationships (H51/H63) and form labels (H44) are sufficient techniques.