# Closed face structure: removable Chips vs single trigger button

Type: grilling
Status: open

## Question

[Multi-select popup accessibility contract](06-multi-select-popup-a11y.md)'s research flagged that the locked closed-face design — removable Chips (each with a × button) inside the trigger — cannot ship as one native `<button>` containing the remove buttons: HTML forbids nested interactive controls, and the checklist declines to pick between the two compliant structures:

1. **Single trigger button, inert chips**: chips render as non-interactive content inside the trigger; removal happens only while the panel is open (via the checkbox rows) or from elsewhere. Simplest semantics; loses tap-to-remove on the closed face locked in [Select presentation policies](01-select-presentation-policies.md).
2. **Composite face (React Aria TagGroup shape)**: the control becomes a labelled container whose chips carry real remove buttons, plus a separate adjacent open button carrying `aria-expanded`/`aria-controls`. Preserves tap-to-remove everywhere; costs an extra Tab stop per chip and a more complex focus/removal-focus choreography.

Decide which structure v1 ships, and record any knock-on edits to the attribute checklist and the Chip term's wording.
