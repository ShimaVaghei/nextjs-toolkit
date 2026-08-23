# Select presentation policies

Type: grilling
Status: resolved

## Question

For the `select` and `multi-select` kinds, unresolved rendering and edge-case policies:

1. How does `placeholder` manifest on a native `<select>` (disabled ghost first option vs. shown only when value is empty)?
2. What renders when the current `value` is not among the resolved Options (stale/unknown value) — raw value display, silent fallback to empty, or error?
3. Is a currently-selected-but-`disabled` Option legal, and how does it render?
4. Exact pending ("Loading…") and rejected ("Couldn't load options") presentation for each of the two kinds.

## Answer

Resolved 2026-08-23 by grilling plus a UI prototype (three chip-placement variants on throwaway route `/multi-select-prototype`, captured on branch `research/multi-select-chip-placement`; winner: variant B with owner modifications).

**Placeholder (select)** — ghost `<option value="" disabled>` always mounted as first child, carrying `hidden={value !== ""}`: it displays as the closed control's label while empty, and drops out of the open dropdown once a real value is chosen. Never a label substitute; never pre-selects a real Option (extends [Accessibility and DOM contract](03-accessibility-dom-contract.md)). **`placeholder` is select-only — multi-select ignores it** (its control has no single display slot).

**Multi-select redesigned as a custom popup** — replaces flat checkbox rows (supersedes the multi-select section of ticket 03; new ARIA contract tracked in [Multi-select popup accessibility contract](06-multi-select-popup-a11y.md)). Face: selected Options shown as removable **Chips** inside a fixed-height control that scrolls horizontally — it never grows (prototype variant B + owner change). Panel: search box filtering resolved Options client-side, above labelled checkbox rows (native inputs retained). Closes on Escape/outside-click; trigger carries `aria-expanded`/`aria-controls`.

**Stale/unknown value** — raw-value display: render a synthetic disabled entry carrying the raw `value` (an extra `<option>` for select; a fallback-labelled Chip for multi-select) plus a dev-only `console.warn`. Display always equals parent state. While the Option load is Pending, absence is expected — not stale.

**Selected-but-disabled Option** — legal by default: `disabled` bars the *user*, not the parent; it renders selected as-is. New optional `FieldConfig` flag **`keepDisabledSelection`** (default `true`); set `false` to demote a held disabled Option to the stale/raw-value display instead. Accepted consequence: deselecting it means the user can't re-pick it.

**Async Options** — `options` accepts `Option[] | (() => Promise<Option[]>)`. Loader form fires on mount → Pending → Resolved/Rejected; **Retry** re-fires the loader (no other retry API in v1). Terms coined in `CONTEXT.md`: Chip, Pending, Rejected.

**Pending / Rejected presentation — one shared contract for both kinds**: control disabled; the hint slot carries the status line — muted "Loading options…" while Pending; "Couldn't load options." beside a small **Retry** button when Rejected (destructive tone, but *not* validation Error styling: no `aria-invalid`, error slot untouched). Any current selection stays visible throughout. The popup interior never shows loading states — it only opens on resolved options.

