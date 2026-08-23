# Multi-select popup accessibility contract — research findings

Research for the hand-built `Field` component's `multi-select` kind: a button-faced trigger showing removable chips, opening a non-modal popup containing a client-side search input above a scrollable list of native labelled checkboxes. All findings verified against primary W3C sources, accessed August 2026.

## Sources consulted

Primary:

1. **WAI-ARIA Authoring Practices Guide (APG) — Combobox Pattern**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (continuously updated; accessed 2026-08-23)
2. **APG — Listbox Pattern**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/listbox/ (accessed 2026-08-23)
3. **APG — Dialog (Modal) Pattern**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (accessed 2026-08-23)
4. **APG — Disclosure (Show/Hide) Pattern**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ (accessed 2026-08-23)
5. **APG — Checkbox Pattern**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/ (accessed 2026-08-23)
6. **APG — Practices: Developing a Keyboard Interface**, W3C WAI, https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ (accessed 2026-08-23)
7. **APG — Select-Only Combobox Example** (page last updated 2025-08-12), W3C WAI, https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
8. **Accessible Rich Internet Applications (WAI-ARIA) 1.2**, W3C Recommendation, 6 June 2023, https://www.w3.org/TR/wai-aria-1.2/
9. **Accessible Name and Description Computation 1.2 (AccName)**, W3C Working Draft, 5 August 2026, https://www.w3.org/TR/accname-1.2/ — stable Recommendation is AccName 1.1 (18 Dec 2018, https://www.w3.org/TR/accname/); computation order cited below is identical in both
10. **HTML Accessibility API Mappings 1.0 (HTML-AAM)**, W3C Working Draft, 29 July 2026, https://www.w3.org/TR/html-aam-1.0/
11. **MDN — `aria-haspopup` attribute** (page last modified 2025-05-12), https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-haspopup — used only for value-syntax confirmation

Secondary corroboration (practice-level, clearly labeled):

12. **React Aria — `Select` documentation**, Adobe, https://react-spectrum.adobe.com/react-aria/Select.html (accessed 2026-08-23) — official *multiple-selection* Select example: chip `TagGroup` with per-chip remove buttons in the trigger area, popover containing `SearchField` + listbox; docs state items "may not contain interactive children."
13. **React Aria — Selection guide**, Adobe, https://react-spectrum.adobe.com/react-aria/selection.html (accessed 2026-08-23) — default `"toggle"` selection "behaves like a checkbox group … often paired with a column of checkboxes."

## Findings

### Q1 — Trigger accessible name

**Verdict:** Author-provided name, mandatory. Prefer **`aria-labelledby` pointing at the field's visible label element** (a visually-hidden `<span id>` is the fallback when no visible label exists); use plain `aria-label` only if no label element is available. Never let content compute the name.

Evidence:

- The `button` role permits both name sources ("Name From: contents, author"; "Accessible Name Required: True") [8], but AccName makes author sources strictly higher priority: content "is used only if higher priority 'author' features are not provided" [9]. The algorithm runs `aria-labelledby` (step 2B) → `aria-label` (step 2D) → host-language label (2E) → recursive subtree content traversal (2F) [9].
- Option (a) therefore concatenates every chip label plus any remove-button glyph text into one flat string [9] — a long, unstable name that changes on every selection change and is re-spoken whenever the trigger regains focus.
- Option (c) matches APG precedent for value-bearing collapsed faces: the Select-Only Combobox example labels its combobox element with `aria-labelledby` referencing the visible label ("Favorite Fruit"), not its internal value text [7].
- Option (b) is conformant but ranks below `labelledby` in APG guidance ordering (visible label → `aria-labelledby` → `aria-label`) [1]; visible-name correspondence also helps voice-control users.
- Disclosure-pattern buttons are named from content only because their content *is* a stable command name [4]; chips are dynamic state, so that convention does not transfer here.
- Chip remove buttons need their own names regardless; AccName's canonical example is exactly this shape — `aria-label="Delete"` combined with a referenced filename via `aria-labelledby="del_row1 file_row1"` [9]. Recommended: `aria-label="Remove <option label>"`.

Flagged implementation risk: nested interactive remove buttons inside one native `<button>` violate the HTML content model (buttons must not contain interactive descendants). React Aria resolves this exact widget by making the closed face a labelled container of removable tags plus a separate open button [12]. If the single native `<button>` face is kept, chips must be inert summary text and removal must live only in the panel.

### Q2 — Focus management for a non-modal popup

**Verdict:** On open, move DOM focus to the popup's first focusable element — the search input. On Escape, return focus to the trigger button. On outside-click dismissal: keyboard-initiated dismiss restores focus to the trigger; pointer-initiated dismiss leaves focus wherever the user clicked. No focus trap — Tab must be able to leave the popup.

Evidence:

- Open: the Combobox pattern moves focus into the popup on open, "places focus on the first focusable element in the popup" [1]; the Dialog pattern places initial focus on the first focusable or most-frequently-used control [3]. The search input is this popup's most-used control.
- Escape-close: "Escape: Closes the popup and returns focus to the combobox" [1]; Dialog pattern: "When a dialog closes, focus returns to the element that invoked the dialog unless…" [3]; APG Keyboard practices generalize it under *Persistence of Focus*: unmanaged close drops focus to `<body>`, so authors must set focus "on the button that triggered the dialog" [6].
- Non-modal contrast: modal dialogs contain their tab sequence and provide no way to move focus outside without closing [3]. This popup is non-modal, so trapping is wrong by definition; Tab-out must remain possible.
- Outside-click focus destination after pointer dismissal: normative sources are silent (flagged under Ambiguities); the keyboard-vs-pointer split above is established library practice [12] and satisfies Persistence of Focus in both branches [6].

### Q3 — Search input ↔ option list semantics

**Verdict:** Adopt **model (c)**: a plain labelled search input (`<input type="text">` with its own `<label>`) above a labelled group of native labelled checkboxes; the trigger stays a disclosure-style button carrying only `aria-expanded` + `aria-controls`. No `role="combobox"`, no `aria-haspopup`, no listbox/option roles.

Evidence per model:

- **(a) Full combobox demands:** `role="combobox"` on the value-bearing element; `aria-expanded` and `aria-controls` are *required* properties (MUST) [8]; implicit `aria-haspopup="listbox"` with popup restricted to listbox/tree/grid/dialog [8]; keyboard support for Down/Up/Escape (+ optionally Home/End/Alt+arrows), with focus managed by `aria-activedescendant` while DOM focus stays on the combobox, or roving DOM focus into the popup [1]; `aria-autocomplete` when typing filters suggestions [1][8]. Decisive negative: the APG states "a combobox is a **single-select** widget where selection follows focus in the popup," its popup notes say the listbox "allows only one suggested value to be selected at a time," and `combobox`'s supported properties exclude `aria-multiselectable` [1][8]. The APG ships no multi-select combobox example [1]. Multi-select inside model (a) means contradicting both pattern and spec.
- **(b) Listbox-only popup:** genuinely multi-select-capable — `aria-multiselectable="true"` on the listbox, Space toggles focused option (or modifier-key alternative model), per-option `aria-selected` or `aria-checked`; focus via `aria-activedescendant` or DOM focus on options [2]. But it forbids this design's rows: "the interaction model conveyed by the listbox role … does not support interacting with elements inside of an option… it does not provide an accessible way to present a list of interactive elements, such as links, buttons, **or checkboxes**" (the APG redirects such lists to the Grid pattern) [2].
- **(c) Plain labelled search input + group of native labelled checkboxes:** compliant by construction — native checkboxes expose role + checked state via platform mappings [10], Space toggles natively [5], grouping is endorsed verbatim: a visible-label checkbox set is wrapped in `role="group"` with `aria-labelledby` [5]. What is lost vs (a)/(b): arrow-key option traversal, type-ahead, single-tab-stop composite behavior (users Tab through filtered checkboxes). The always-present search field substitutes for type-ahead, and native forms-mode behavior is what screen-reader users expect from a checkbox group [13 - secondary].

Trigger consequences of choosing (c): keep `aria-expanded` and `aria-controls` per the Disclosure pattern (`aria-controls` explicitly optional but useful) [4]; omit `aria-haspopup` — Disclosure uses none, and the attribute enumerates only menu/listbox/tree/grid/dialog popup types [11], each implying interaction contracts this widget does not implement.

### Q4 — Native checkboxes inside the panel

**Verdict:** Confirmed sound. Keep native `<input type="checkbox">` rows. Wrap them in `<fieldset>` + `<legend>` (preferred) or `role="group"` + `aria-labelledby`. Do **not** wrap rows in `role="option"`.

Evidence:

- Native soundness: HTML-AAM maps `input type=checkbox` to the `checkbox` role with checked state derived from the control (including `mixed`) [10]; the APG checkbox pattern's contract is exactly Space-to-toggle plus `aria-checked` true/false/mixed [5]. Native inputs deliver this with zero authoring risk.
- Grouping: checkbox pattern specifies `role="group"` + `aria-labelledby` for visibly labelled sets [5]; its own mixed-state example is "two-state HTML checkboxes contained in an HTML `fieldset`" [5]. ARIA 1.2 lists `<fieldset>` as the related concept of `group` [8]; HTML-AAM maps `fieldset` → `group`, named by the first rendered `legend` child (hidden legend contributes no name) [10].
- If rows became `role="option"`: three conflicts arise. First, `option` has characteristic **Children Presentational: True** [8] — descendants are flattened, so the inner checkbox's role/state vanish from the accessibility tree. Second, the APG states options cannot contain interactive elements such as checkboxes [2]. Third, dual state machinery collides: options carry required `aria-selected` (default false) [8] while the visual affordance is a checkbox's `aria-checked`; APG warns against mixing both states in one widget and demands separate controls if ever combined [2]. Focus also becomes ambiguous under `aria-activedescendant` management [1][6].
- Filtered-out rows should be removed from rendering (or `display:none`) so they leave the accessibility tree rather than lingering as hidden-but-exposed controls.

### Q5 — Selection change announcements

**Verdict:** In-panel checkbox toggles need **no additional announcement** — native checked-state announcements cover them; stay silent to avoid double-speak. Chip removals performed **outside** the open panel (× buttons on the closed face) should announce through the existing always-mounted `aria-live="polite"` region with a short message ("Removed Design. 3 selected."). Do not add assertive announcements.

Evidence:

- Native announcement basis: HTML-AAM maps `input type=checkbox` to `checkbox` role with live-checked state exposure [10]; the checkbox pattern's entire interaction contract is Space toggles that state [5]. Screen readers announce checked changes because the state change flows through platform accessibility APIs — no author-supplied live text required (UA/AT behavior, not spelled out verbatim in any spec — flagged honestly).
- Live region mechanics: `aria-live` marks an element whose updates ATs are expected to relay; `polite` means updates "SHOULD announce … at the next graceful opportunity," and authors SHOULD NOT use `assertive` unless interruption is imperative [8]. `role="status"` would even imply polite+atomic implicitly [8]; keeping the existing explicit `aria-live="polite"` paragraph is equivalent and already mounted.
- Why chip × needs it: removal happens while focus sits on the trigger/chip area with the panel closed — outside any context that announces the change natively; Persistence-of-Focus-style reasoning says the user needs feedback tied to the action they just took [6]. In-panel additions don't need this because the toggle itself announces.
- Reusing the validation-error region is acceptable and pragmatic (one well-placed polite region per field), with the caveat that rapid successive messages queue or clobber — specs do not regulate interleaving of error vs. status messages (flagged); keep messages short and last-message-wins.
- Secondary corroboration: React Aria routes collection selection announcements through an internal live-region announcer rather than relying solely on per-control state speech [12][13].

### Ambiguities / silences flagged

- **Outside-click focus return:** no primary source specifies where focus goes after pointer dismissal of a non-modal popup. The keyboard-vs-pointer split recommended here is library practice [12], not normative text.
- **No exact pattern match exists:** the APG has no pattern or example for "button-triggered multi-select filterable popup"; verdicts combine Combobox [1], Listbox [2], Dialog [3], Disclosure [4] analogues.
- **Multi-select combobox:** APG declares comboboxes single-select and publishes no multiselect variant [1]; ARIA 1.2 `combobox` excludes `aria-multiselectable` [8]. Anything calling itself a multi-select combobox is off-spec territory.
- **AccName version status:** AccName 1.2 is a Working Draft (Aug 2026); quotes reflect long-stable algorithm text also present in the 1.1 Recommendation [9].
- **Live-region message interleaving** (validation errors vs. chip-removal notices sharing one region) is unregulated; sequencing strategy is implementer's choice.
- **Native checkbox announcement wording/timing** is UA/AT implementation behavior inferred from mapping specs [10], not guaranteed prose anywhere.

## Recommended attribute checklist

### Trigger (closed face)

- [ ] Element: native `<button type="button">` (or, if chips-with-remove must be interactive in the face, a labelled container of chip-remove buttons + separate open `<button>` — never buttons nested inside a button).
- [ ] `aria-labelledby="<field-label-id>"` pointing at the visible field label element; if no label element exists, `aria-label="Field label"` instead.
- [ ] Do NOT let content compute the name; do NOT add `role="combobox"`.
- [ ] `aria-expanded="true|false"` — always present, synced to panel visibility.
- [ ] `aria-controls="<panel-id>"` referencing the panel container.
- [ ] No `aria-haspopup`.
- [ ] Trigger stays in the normal Tab sequence.

### Chips + remove buttons

- [ ] Chip text = plain text (option label); no ARIA role required on the chip itself.
- [ ] Each remove control is its own focusable `<button>` with `aria-label="Remove <option label>"`.
- [ ] Remove buttons remain reachable by Tab while visible; removing the focused chip moves focus to the next chip's remove button (or the trigger when none remain).

### Popup container

- [ ] Plain `<div id="<panel-id>">`; no dialog/listbox role, no focus trap, no `aria-modal`.
- [ ] Hidden state removes it from rendering/AT (`hidden` or `display:none`); `aria-controls` may keep referencing it while hidden [1].
- [ ] Rendered adjacent to the trigger so DOM order matches visual/reading order.

### Search input

- [ ] Native `<input type="text">` with a visible (or visually-hidden) `<label>` ("Search options").
- [ ] First focusable element inside the panel.
- [ ] Client-side filtering only hides/shows rows via display removal — no aria-live on the results count required (optional polite "N of M shown" if user testing demands).

### Group wrapper for option rows

- [ ] Preferred: `<fieldset>` + `<legend>` carrying the group label (e.g., the field label or "Options").
- [ ] Equivalent fallback: wrapper with `role="group"` and `aria-labelledby="<legend-or-label-id>"`.
- [ ] The search input sits *outside* the group.

### Each option row

- [ ] `<label>` wrapping one native `<input type="checkbox" value=…>` plus the option text.
- [ ] No extra ARIA needed on rows; no `role="option"`, no `aria-selected`, no `tabindex` on the row.
- [ ] Filtered-out rows are removed from the accessibility tree (not merely visually clipped).
- [ ] Checkbox `disabled` state used for non-selectable options (native semantics carry it).

### Live region usage

- [ ] Keep the single always-mounted `<p aria-live="polite">` (visually-hidden) per field.
- [ ] Validation errors render there as today.
- [ ] On chip × removal while panel closed, write a short message: `Removed <label>. N selected.` (last message wins; never assertive).
- [ ] No message for in-panel checkbox toggles — native checked announcement suffices.

### Focus rules

- [ ] Open (click, Enter, Space, or Down Arrow on trigger): move DOM focus to the search input.
- [ ] Close via Escape (from anywhere in panel): return focus to the trigger button.
- [ ] Close via outside keyboard action / Tab-out: let focus move naturally; panel closes; no trap.
- [ ] Close via outside pointer click: close without moving focus.
- [ ] Never leave `document.activeElement` on a removed node (Persistence of Focus) [6].

### Keyboard map (panel open)

- [ ] Typeable characters → enter into search input (browser-native editing untouched) [1].
- [ ] Tab / Shift+Tab → standard order: search input → each visible checkbox → out of panel (closes on exit is optional; do not trap).
- [ ] Space → toggles focused checkbox (native).
- [ ] Escape → close panel, focus returns to trigger.
- [ ] Enter on trigger → toggle panel. (Arrow-key navigation across rows is intentionally not implemented under model (c); revisit only if the design ever switches to listbox semantics.)


