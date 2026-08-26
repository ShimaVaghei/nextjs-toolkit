# Research: Calendar popup accessibility & interaction conventions

Ticket: `.scratch/field-date-kinds/issues/01-calendar-popup-a11y-research.md`
Scope: conventions the custom calendar popup for the four date Field kinds must follow,
researched against primary sources (W3C WAI-ARIA Authoring Practices Guide "APG" first;
reference implementations — React Aria, USWDS, MUI X — used where APG is silent, which is
the case for range picking and "today" labelling).

Source references `[Sn]` map to the **Sources** section at the bottom. Each checklist item
ends with the source(s) it traces to.

---

## Checklist (deliverable)

### 1. Roles & attributes

**Trigger / field**

- [ ] The control that opens the popup exposes `aria-haspopup="dialog"`, `aria-expanded`
      (`true`/`false` mirroring popup state), and `aria-controls` pointing at the popup's id.
      *[S4 — "Date Picker Dialog: Combobox" attribute table]*
- [ ] The trigger's accessible name carries the current value so screen readers get
      confirmation when focus returns after close: APG renames "Choose Date" to
      `"Change Date, DATE_STRING"` after selection. For range kinds, compose both endpoint
      strings into the name/description. *[S2 §Accessibility Features, §Choose Date Button]*
- [ ] Popup container: `role="dialog"` with an accessible name (`aria-label="Choose Date"`
      or `aria-labelledby` the visible heading). *[S2, S4 — "Date Picker Dialog" attributes]*
- [ ] ⚠ **Decision point:** `aria-modal="true"` is what the APG examples use, but the APG
      Dialog pattern warns to mark a dialog modal **only** when application code blocks all
      interaction outside it *and* visual styling obscures it. Our popup follows the select
      Options-popup spirit (lightweight disclosure, background stays interactive) — if we do
      not make the page inert behind it, we must NOT set `aria-modal="true"`.
      *[S1 §WAI-ARIA Roles, States, and Properties — Note]*

**Calendar grid**

- [ ] Month view is `role="grid"`. If built from `<table>/<tr>/<th>/<td>`, the `row`,
      `columnheader`, and `gridcell` roles are implied and must not be duplicated; a
      `<div>`-based build must set `row` / `columnheader` / `gridcell` explicitly.
      *[S2, S4 — "Date Picker Dialog: Date Grid"; S3 §Roles, States, Properties]*
- [ ] The grid gets its accessible name from the visible month/year heading via
      `aria-labelledby`. *[S2, S4 — grid attributes]*
- [ ] The month/year heading is `aria-live="polite"` so month/year changes (via nav buttons
      or PageUp/PageDown) are announced without moving focus.
      *[S2, S4 — `aria-live` on `h2`]*
- [ ] Abbreviated weekday headers carry full names for AT: `abbr` attribute on `<th>`
      (or equivalent `aria-label` on a div-based header cell).
      *[S2, S4 — Note under grid attributes]*
- [ ] Navigation buttons (previous/next month/year) get explicit `aria-label`s
      (e.g. "Next Year"). *[S2, S4 — "Calendar Navigation Buttons"]*
- [ ] Optional but conventional: wrap the grid(s) in a labelled grouping element
      (`role="group"` + label) — reference implementations put calendar props on a
      "grouping element containing one or more date grids". Not required by the APG example.
      *[S8 — `calendarProps`; S7 §Anatomy]*

### 2. Keyboard map (grid)

From the APG Date Picker Dialog/Combobox examples *[S2 §Keyboard Support, S4 §Keyboard Support]*,
which themselves implement the Grid pattern's data-grid navigation *[S3]*:

| Key | Behaviour |
| --- | --- |
| Enter / Space (on trigger) | Open popup; focus selected day, else today |
| Right / Left Arrow | Next / previous day (no wrap past row edge — grid pattern rule) |
| Up / Down Arrow | Same weekday in previous / next week (±7 days) |
| Home / End | First (e.g. Sunday) / last (e.g. Saturday) day of current week |
| PageUp / PageDown | Previous / next **month**; focus same day-number, clamped to last day of month |
| Shift+PageUp / Shift+PageDown | Same, but previous / next **year** |
| Enter / Space (on day) | Select the day; close popup; return focus to trigger; update value |
| Escape | Close popup, return focus to trigger, discard pending selection |
| Tab / Shift+Tab | Move through popup controls (prev-month, next-month, grid, Cancel/OK…); exactly **one** gridcell is a tab stop |

Supporting rules:

- [ ] Roving tabindex across gridcells: focused cell `tabindex="0"`, all others
      `tabindex="-1"`, swapped dynamically. *[S2, S4 — tabindex rows; S5 §Managing Focus…
      Roving tabindex]*
- [ ] Arrows do **not** wrap at grid edges (data-grid behaviour, unlike layout grids).
      *[S3 §Keyboard Interaction For Data Grids]*
- [ ] Only one element of the whole grid is ever in the Tab sequence.
      *[S2, S4 — Tab rows; S3 §About This Pattern]*

### 3. Focus management

- [ ] **On open:** focus lands on the day matching the field's current value; if empty or
      invalid, focus lands on **today**. *[S2 §About This Example + Choose Date Button key row]*
- [ ] **On close (Escape, day selection, Cancel/OK):** focus returns to the element that
      invoked the popup (the trigger). *[S2 ESC row; S1 §Keyboard Interaction — Note 2]*
- [ ] **Trapping:** only if we choose modal semantics — a modal dialog contains its own Tab
      sequence and Tab wraps from last to first control inside it. If we go non-modal
      (Options-popup spirit), see the `aria-modal` decision point above and let Tab exit
      naturally. *[S1 §Keyboard Interaction]*
- [ ] **Month change:** PageUp/PageDown and the nav buttons change the displayed month but
      focus **stays inside the grid** (same day-number, clamped); the user hears the new
      month/year because the heading is a polite live region — never move focus to the
      heading. *[S2 §Keyboard Support PageUp/Down rows + `aria-live` on `h2`]*

### 4. Disabled / out-of-min–max days

- [ ] Days outside `min`/`max` are signalled with `aria-disabled="true"` on the gridcell —
      `gridcell` is a role that supports `aria-disabled`. *[S6 §Associated roles]*
- [ ] Prefer `aria-disabled` over the native `disabled` attribute here: native `disabled`
      removes elements from the focus order, so screen-reader users browsing the grid never
      discover those days exist; `aria-disabled` keeps them perceivable and discoverable
      while marking them inoperable. *[S6 — intro paragraphs]*
- [ ] Reference-implementation strategy (recommended): out-of-bounds/"unavailable" days
      **remain keyboard-focusable** so navigation stays consistent; activating them simply
      does not change the value. *[S7 §Unavailable dates]*
      The alternative coherent strategy is native `disabled` + keyboard navigation that
      skips/clamps to bounds so focus can never land on a dead cell; either way arrow
      navigation must never strand focus. *(Derived from S6+S7 trade-off.)*
- [ ] Pair the state with visible styling (greyed) that survives forced-colors mode, with
      consistent treatment whether `disabled` or `aria-disabled` is used.
      *[S9 §Latest updates 2023-06-09 entry]*

### 5. Range picking (`date-range` / `datetime-range`) — two-step communication

⚠ Honest gap: **no W3C/APG pattern exists for range pickers** — the APG catalogue only has
single-date examples. The conventions below come from the major reference implementations
and should be treated as de-facto standards, validated with real screen readers during the
prototype.

- [ ] Two-step model: first activation **anchors the start**; second activation completes
      the range; if the second day precedes the anchor, the endpoints swap. React Aria
      formalises this as an *anchor date*: `isDateUnavailable(date, anchorDate)` lets
      availability depend on the already-picked first endpoint, and `commitBehavior`
      (`"clear" | "reset" | "select"`) defines what happens when pointer-release-outside or
      blur interrupts a mid-flight selection. *[S8 — `isDateUnavailable`, `commitBehavior`]*
- [ ] Announce step transitions through an `aria-live` region: reference implementations ship
      localized messages that announce "when the selection and visible date range change".
      Recommended messages: after first click — "Selected range start: ⟨date⟩, now select the
      end date"; after second — "Selected range: ⟨from⟩ to ⟨to⟩".
      *[S7 §Accessible (feature bullet); S12 §Accessibility Tips (live region for selections)]*
- [ ] Compose the state into each cell's accessible name, e.g. `"⟨Weekday, Month D, YYYY⟩,
      selected range start"` / `"selected range end"` — following the APG precedent of
      baking state into names ("Change Date, DATE_STRING"). Do **not** use
      `aria-valuetext`: it is defined for range widgets (slider, spinbutton, scrollbar,
      separator, progressbar), not `gridcell`. *[S2 §Choose Date Button; S13 §aria-valuetext]*
- [ ] In-range highlighting: there is no dedicated "in-range" ARIA state. The convention is
      a continuous visual band across start→end **plus** programmatic association: every
      cell inside the range carries the selected state (`aria-selected="true"` + selected
      styling), matching how React Aria renders each in-range cell with its selected state.
      *[S8 §CalendarCell/`isSelected` rendering model; S7 §CalendarCell]*
- [ ] Keyboard flow for range mode reuses the single-date grid map unchanged; paging between
      months stays on the grid/header buttons. *[S11 §Date Range Calendar]*
- [ ] Accepted alternative shape (if the single-popup two-step UX proves hostile to AT):
      two linked single-date popups where the start value constrains the end field's minimum
      (USWDS wires `data-min-date`/`data-max-date` this way). *[S9 §Component code +
      §Properties]*
- [ ] Whatever the shape, the screen reader must hear the component's selection status —
      labels, role, state, and the current selection. *[S10 §Screen reader tests — "date
      selection status"]*

### 6. Today vs selected day

- [ ] Gap: the APG example marks only the *value* date with `aria-selected` and gives today
      no special semantics. *[S2 §aria-selected — "Only set on the cell containing the
      currently selected date"]*
- [ ] Ecosystem convention: distinguish today in the **accessible name**
      (e.g. `"Today, ⟨full date⟩"`) while keeping *selected* as a **state**
      (`aria-selected="true"`) rather than name text — libraries expose dedicated label hooks
      for exactly this (DayPicker `labels` prop; React Aria's localized selection
      announcements). Keeping "selected" out of the name avoids stale names when selection
      moves. *[S12 §Accessibility Props; S7 §Accessible]*
- [ ] Visual today marker must not rely on colour alone (bold/ring/dot alongside colour);
      test with forced-colors. *[S9 §Latest updates forced-colors entries; S2 §High contrast
      support]*

---

## Sources

Primary (W3C WAI-ARIA APG / specification):

- **[S1]** APG — Dialog (Modal) Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>
  (§Keyboard Interaction; §WAI-ARIA Roles, States, and Properties + Note)
- **[S2]** APG — Date Picker Dialog Example — <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/>
  (§About This Example; §Accessibility Features; §Keyboard Support; §Role, Property, State, and Tabindex Attributes)
- **[S3]** APG — Grid Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/grid/>
  (§About This Pattern; §Keyboard Interaction For Data Grids; §WAI-ARIA Roles, States, and Properties)
- **[S4]** APG — Date Picker Combobox Example — <https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/>
  (§Keyboard Support; §Role, Property, State, and Tabindex Attributes — incl. `aria-haspopup="dialog"`)
- **[S5]** APG — Keyboard Interface practices (roving tabindex) — <https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex>
  (referenced directly by S2/S4 for the one-tab-stop gridcell technique)
- **[S13]** WAI-ARIA 1.2 — `aria-valuetext` — <https://www.w3.org/TR/wai-aria-1.2/#aria-valuetext>
  (supported roles: range widgets, not gridcell)

Reference implementations & government design systems (used where APG is silent):

- **[S6]** MDN — `aria-disabled` — <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled>
  (focus-order/discoverability trade-off; associated roles incl. `gridcell`)
- **[S7]** React Aria — `useCalendar` — <https://react-aria.adobe.com/Calendar/useCalendar.html>
  (feature bullets §Accessible; §Anatomy; §Unavailable dates; §CalendarCell)
- **[S8]** React Aria — `useRangeCalendar` — <https://react-spectrum.adobe.com/react-aria/useRangeCalendar.html>
  (`calendarProps` grouping element; `commitBehavior`; `isDateUnavailable(date, anchorDate)`)
- **[S9]** USWDS — Date range picker — <https://designsystem.digital.gov/components/date-range-picker/>
  (§Guidance; §Component code; §Properties; §Latest updates — `aria-disabled` parity, forced-colors, contrast)
- **[S10]** USWDS — Date range picker accessibility tests — <https://designsystem.digital.gov/components/date-range-picker/accessibility-tests/>
  (§Screen reader tests — "announces date range picker component and date selection status")
- **[S11]** MUI X — Date and Time Pickers Accessibility — <https://mui.com/x/react-date-pickers/accessibility/>
  (§Keyboard support — Date Range Calendar)
- **[S12]** React DayPicker — Accessible Date Pickers — <https://daypicker.dev/guides/accessibility>
  (follows APG date-picker dialog; `labels` prop; live-region tip for announcing selections)
