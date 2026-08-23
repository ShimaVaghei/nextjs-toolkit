# Multi-select popup accessibility contract

Type: research
Status: resolved

## Question

The multi-select Field is now a custom popup — trigger showing horizontally-scrolling removable Chips, a search box, and labelled checkbox rows — superseding the fieldset/legend checklist in [Accessibility and DOM contract](03-accessibility-dom-contract.md). Verified against WAI-ARIA APG / current sources:

1. Trigger semantics: `aria-expanded`/`aria-controls` on the button — what is its accessible name given Chips (and their remove buttons) sit inside it?
2. Focus management: where focus lands on open, Escape, outside-click close; trap or no trap.
3. Search input ↔ option list relationship: combobox/listbox pattern vs. a plain labelled group; arrow-key behaviour; `aria-activedescendant` vs. DOM focus.
4. Confirm native checkbox inputs stay inside the panel (recommended in grilling) against pattern guidance.
5. Whether selection changes need announcement (reuse of the always-mounted polite live region vs. nothing).

Deliverable: a per-element attribute checklist the implementation ticket applies directly.

## Answer

Resolved by research subagent against primary sources — WAI-ARIA APG, WAI-ARIA 1.2, AccName (2026-08-23). Full findings with citations and the per-element attribute checklist: [`.scratch/field/research/multi-select-popup-a11y.md`](../research/multi-select-popup-a11y.md). The checklist applies to whoever builds Field after the map closes (the in-map implementation step was closed out of scope).

Verdicts:

1. **Trigger name** — author-provided, never content-computed: `aria-labelledby` → the visible field label element (`aria-label` fallback); content-naming would concatenate every Chip and its × into an unstable name.
2. **Focus** — non-modal popup, no trap: open moves focus to the search input; Escape returns it to the trigger; Tab-out closes naturally; pointer outside-click closes without moving focus (that split is library practice, not normative).
3. **Search ↔ list semantics** — model (c): plain labelled search input + labelled group of native checkboxes under a disclosure-style trigger. Combobox is single-select by APG declaration and ARIA 1.2 gives `combobox` no `aria-multiselectable`; listbox `role=option` forbids interactive children — both contradict this design. No combobox role, no `aria-haspopup`.
4. **Native checkboxes confirmed** — wrap rows in `fieldset`/`legend` (or `role=group` + `aria-labelledby`); never `role=option` wrappers (`option` is Children Presentational: True — inner checkbox semantics would vanish). Search input sits outside the group.
5. **Announcements** — in-panel toggles stay silent (native checked-state announcement, HTML-AAM basis); chip-× removals while the panel is closed announce politely via the existing always-mounted polite live region ("Removed X. N selected.").

Honest flags: no exact APG pattern exists for this widget (verdicts combine Combobox/Listbox/Dialog/Disclosure analogues); pointer-dismiss focus return and live-region interleaving are unregulated; multi-select combobox is explicitly off-spec territory.

**Surfaced design risk → new decision ticket**: native remove buttons nested inside a single trigger `<button>` violate HTML's interactive-descendants content model. The checklist offers two compliant structures but does not choose — escalated to [Closed face structure: removable Chips vs single trigger button](09-closed-face-chip-buttons.md), which the build consumes alongside this checklist.
