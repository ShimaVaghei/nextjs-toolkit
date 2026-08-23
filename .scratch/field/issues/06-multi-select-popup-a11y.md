# Multi-select popup accessibility contract

Type: research
Status: open

## Question

The multi-select Field is now a custom popup — trigger showing horizontally-scrolling removable Chips, a search box, and labelled checkbox rows — superseding the fieldset/legend checklist in [Accessibility and DOM contract](03-accessibility-dom-contract.md). Verified against WAI-ARIA APG / current sources:

1. Trigger semantics: `aria-expanded`/`aria-controls` on the button — what is its accessible name given Chips (and their remove buttons) sit inside it?
2. Focus management: where focus lands on open, Escape, outside-click close; trap or no trap.
3. Search input ↔ option list relationship: combobox/listbox pattern vs. a plain labelled group; arrow-key behaviour; `aria-activedescendant` vs. DOM focus.
4. Confirm native checkbox inputs stay inside the panel (recommended in grilling) against pattern guidance.
5. Whether selection changes need announcement (reuse of the always-mounted polite live region vs. nothing).

Deliverable: a per-element attribute checklist the implementation ticket applies directly.
