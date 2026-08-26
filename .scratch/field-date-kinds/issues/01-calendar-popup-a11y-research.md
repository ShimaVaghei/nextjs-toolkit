Type: research
Status: resolved

## Question

What interaction and accessibility conventions must the custom calendar popup follow? Research against primary sources (WAI-ARIA Authoring Practices date-picker dialog/grid pattern): the keyboard map (arrows, PageUp/PageDown, Home/End, Enter, Escape), roles/names/aria attributes for the grid and day cells, focus management on open/close and on month change, how disabled/out-of-range days are signalled, and how two-step range picking (from click, then to click) is conventionally communicated to screen readers. Deliverable: a concrete checklist the prototype (04) and implementation can build against.

## Answer

The APG Date Picker Dialog pattern mandates: a `dialog` popup containing a `grid`/`gridcell` month table with roving tabindex, `aria-selected` on the value date, an `aria-live="polite"` month/year heading, the full arrow/PageUp/Home/End/Enter/Esc keyboard map, focus placed on the selected day (or today) on open and returned to the trigger on close, and out-of-bounds days marked `aria-disabled="true"` so they stay discoverable. Range picking has no W3C pattern; reference implementations (React Aria anchor-date model, USWDS, MUI X) establish two-step start→end picking announced via live regions, composed accessible names ("selected range start"), and selected-state styling across in-range cells. One open decision flagged for prototype 04: `aria-modal="true"` is only correct if the page is made truly inert behind the popup — otherwise omit it.

Full findings: `.scratch/field-date-kinds/research/01-calendar-popup-a11y.md`
