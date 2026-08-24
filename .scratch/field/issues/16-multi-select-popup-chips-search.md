# 16 — Multi-select popup — Chips, search, focus choreography

Type: task
Status: ready-for-agent

## What to build

Add the `multi-select` kind as a custom popup widget (no combobox/listbox roles anywhere, no `aria-haspopup`, no focus trap):

**Closed face** — composite structure honouring HTML's no-nested-interactive rule: a labelled container (`role="group"` named via `aria-labelledby` pointing at the visible field label — never content-computed) holding real removable Chips, each × carrying `aria-label="Remove <option label>"`, plus one separate adjacent open button carrying `aria-expanded`/`aria-controls` with `aria-label="Show options"`. Chips sit in a fixed-height strip that scrolls horizontally under a slim styled scrollbar (~4px rounded thumb, transparent track, dark-mode variant) — the control never grows.

**Panel** — a plain disclosure popup: a labelled search input filtering resolved Options client-side (filtered rows removed from rendering, leaving the accessibility tree), above a `fieldset`/`legend` group of native labelled checkboxes. Toggling adds/removes membership in the value array; Chips appear/disappear in step; Chip remove-buttons remove from anywhere.

**Focus choreography** — open moves DOM focus to the search input; Escape returns focus to the open button; Tab-out closes naturally (no trap); pointer outside-click closes without moving focus; removing the focused Chip hops focus to the neighbouring × (the chip that took its slot; last chip if it was last; open button when none remain); active focus never rests on a removed node.

**Announcements** — closed-face removals write "Removed X. N selected." into the shared always-mounted polite region (last message wins); in-panel toggles stay silent — native checked-state announcement suffices. Keyboard: Enter/Space opens, Space toggles focused checkboxes, Tab reaches the open button and each visible chip's ×. `placeholder` is ignored by this kind.

Full decisions: the Field spec (`../spec.md`) plus the research checklist with W3C citations (`research/multi-select-popup-a11y.md`).

Blocked by: 14 — Select kind with static Options.

## Acceptance criteria

- [ ] Closed face: group container named by the visible label; each Chip removable via its own named button; separate open button carries synced `aria-expanded`/`aria-controls`
- [ ] Panel: search filters rows client-side; rows are fieldset/legend-wrapped native checkboxes; filtered rows leave the accessibility tree
- [ ] Toggle semantics: checkbox adds/removes membership; Chip appears/disappears in step; Chip × removes while closed or open
- [ ] Focus: open→search input; Escape→open button; outside pointer click closes without moving focus; removal focus-hops correctly down to zero chips
- [ ] Removals from the closed face announce "Removed X. N selected."; in-panel toggles announce nothing extra
- [ ] Strip scrolls horizontally with the styled scrollbar; never grows vertically; dark mode holds
- [ ] Multi-select toggle semantics and popup choreography pinned by tests at the public seam; demo page gains a multi-select section; lint and typecheck green
