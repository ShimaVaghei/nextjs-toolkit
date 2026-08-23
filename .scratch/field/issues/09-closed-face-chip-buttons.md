# Closed face structure: removable Chips vs single trigger button

Type: grilling
Status: resolved

## Question

[Multi-select popup accessibility contract](06-multi-select-popup-a11y.md)'s research flagged that the locked closed-face design — removable Chips (each with a × button) inside the trigger — cannot ship as one native `<button>` containing the remove buttons: HTML forbids nested interactive controls, and the checklist declines to pick between the two compliant structures:

1. **Single trigger button, inert chips**: chips render as non-interactive content inside the trigger; removal happens only while the panel is open (via the checkbox rows) or from elsewhere. Simplest semantics; loses tap-to-remove on the closed face locked in [Select presentation policies](01-select-presentation-policies.md).
2. **Composite face (React Aria TagGroup shape)**: the control becomes a labelled container whose chips carry real remove buttons, plus a separate adjacent open button carrying `aria-expanded`/`aria-controls`. Preserves tap-to-remove everywhere; costs an extra Tab stop per chip and a more complex focus/removal-focus choreography.

Decide which structure v1 ships, and record any knock-on edits to the attribute checklist and the Chip term's wording.

## Answer

Arbitrated against a prototype (2026-08-23): **the composite face ships** — variant B. HTML's no-nested-interactive rule is honoured by splitting the closed face into a labelled container plus a separate open control; tap-to-remove survives everywhere instead of being quietly deleted by the a11y fix. The single-trigger/inert-chips structure (variant A) was built and rejected.

Structure (closes the fork left open in the [research checklist](../research/multi-select-popup-a11y.md), "Trigger (closed face)"):

- Closed face = container `role="group"` named via `aria-labelledby` → visible field label, holding real Chips each with its own remove `<button>` (`aria-label="Remove <option label>"`), plus one separate adjacent open `<button>` carrying `aria-expanded`/`aria-controls` and `aria-label="Show options"`.
- Content never computes any name; still no combobox/listbox roles anywhere (per [Multi-select popup accessibility contract](06-multi-select-popup-a11y.md)).
- Focus choreography: removing the focused chip moves focus to the neighbouring chip's × (the chip that took its slot; the last chip if it was last) or to the open button when none remain. Escape from the panel returns focus to the open button.
- Live region unchanged: closed-face removals announce "Removed X. N selected." through the shared polite region; in-panel toggles stay silent.
- Presentation: the strip scrolls horizontally under a slim styled scrollbar (~4px rounded thumb, transparent track, dark-mode variant). Hidden-scrollbar-with-edge-fades was prototyped and rejected as less legible.

Knock-ons:

- Research checklist trigger fork resolved to its second branch; the single-native-button face is out for good.
- **Chip** term needs no rewording — removable pill inside the non-growing control still holds; only the DOM realization changed.
- Tab cost accepted as designed: one extra stop per selected Option (N selections → N+1 stops before the next field). Roving-tabindex compaction noted as future refinement, not v1 scope.

Prototype captured on branch `research/closed-face-chip-buttons` (throwaway route `app/field-closed-face-proto/`, variants behind `?variant=`).
