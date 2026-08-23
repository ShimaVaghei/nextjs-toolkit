# Wayfinder map: Field component

Label: wayfinder:map

## Destination

The route to the reusable `Field` component fully charted: every decision needed to build `components/Field.tsx` — with tests and a demo page — locked in this map's resolved tickets, implementing exactly the Form terms locked in `CONTEXT.md` (Field, Field kind, Input type, Option, FieldConfig, Validator, Touched, Error, FieldHandle). Implementation itself happens after the map closes.

## Notes

- Every component-level design decision was locked in a grilling + domain-modeling session (2026-08-23); the canonical vocabulary and decisions live in `CONTEXT.md`, section "Form terms". Zoom there before any ticket.
- Consult `/domain-modeling` in any session that coins or sharpens terms; update `CONTEXT.md` inline as terms resolve.
- Standing preferences: config-object API mirroring `TableConfig`; no external libraries; Tailwind with dark-mode variants; vitest + testing-library specs beside the component; demo pages under `app/<component>/`.

## Decisions so far

<!-- one line per closed ticket: name-linked, one-line gist -->

- [Hint and status visuals](issues/07-hint-and-status-visuals.md) — Variant B "feedback rail" wins: hint / Pending / Rejected+Retry / Error all stack compactly below the control, label→control gap widened (`mt-1.5`); muted Pending and red-but-not-error-slot Rejected read correctly beside a real validation Error, dark modes included. Prototype on branch `research/field-status-visuals`.
- [Multi-select popup accessibility contract](issues/06-multi-select-popup-a11y.md) — disclosure-style popup over combobox/listbox roles (both are single-select-only per APG/ARIA 1.2); trigger named via `aria-labelledby`→visible label; focus to search input on open, Escape returns it, no trap; `fieldset`/`legend` rows of native checkboxes, never `role=option`; in-panel toggles silent, chip-× removals announced via the shared polite live region. Full checklist in [research findings](research/multi-select-popup-a11y.md); nested-button conflict on the closed face escalated to [Closed face structure](issues/09-closed-face-chip-buttons.md).
- [Demo page and test scope](issues/04-demo-page-and-test-scope.md) — one demo page at `app/field/` (async-options section with simulate-failure toggle, not split routes); Error stays internal — no `onErrorChange` in v1; number input coerces (`""`/number/NaN-as-Empty); first blur evaluates and reveals; ten-item minimum vitest contract pinned (coercion matrix, touched lifecycle, async Pending/Rejected/Retry, force-run `validate()`, multi-select toggles, dev-warns, stale fallback, ghost option, `keepDisabledSelection`, a11y floor).
- [Arbitrate flagged accessibility conflicts](issues/08-arbitrate-flagged-a11y-conflicts.md) — required marker = `*` + visually-hidden "(required)" (non-visual conveyance closed, locked look intact); `name`/`autoComplete` stay out of v1 as an accepted WCAG 1.3.5 gap, revisited with a forms-composition effort.
- [Validator on boolean and the definition of empty](issues/02-validator-boolean-and-empty.md) — `false` counts as Empty on checkbox (required = must-tick, consent pattern); non-applicable rules ignored with a dev-only warn naming field + rule, FieldConfig stays flat; **Empty** coined and finalized per kind (`""`/`null`/`undefined` everywhere, `[]` for multi-select, text kinds trim before testing).
- [Accessibility and DOM contract](issues/03-accessibility-dom-contract.md) — always-mounted `aria-live="polite"` error `<p>` + describedby (hint→error order) + `aria-invalid` on failure only; `fieldset`/`legend` for multi-select; per-kind attribute checklist done. Two conflicts flagged for the human: required-marker wording, and the deferred-`autoComplete` WCAG 1.3.5 gap.
- [Select presentation policies](issues/01-select-presentation-policies.md) — select keeps a hidden-after-selection ghost option and owns `placeholder`; multi-select rebuilt as a custom popup (search + native checkboxes + removable Chips in a fixed-height horizontally-scrolling control — prototype variant B on branch `research/multi-select-chip-placement`, superseding ticket 03's multi-select section); stale values render raw-value fallback + dev warn; held disabled Options stay legal via new `keepDisabledSelection` flag (default true); async `options` loader with Pending/Rejected + Retry rendered as hint-slot status lines. Coined Chip / Pending / Rejected.

## Not yet specified

- Whether to record an ADR for the hand-rolled-no-form-library trade-off — offered twice in grilling, never confirmed; decide before the map closes. The multi-select popup decision has strengthened the case: hand-rolled popup machinery (trigger, focus, Escape/outside-click) now rides on that same trade-off.

## Out of scope

- Forms composition layer: multi-field forms, submit orchestration, form-level validation, dirty-state tracking — the destination ends at the single component.
- Component implementation: building `components/Field.tsx`, its vitest suite, and the demo page — initially ridden in-map as [Implement Field](issues/05-implement-field.md) by explicit owner override of plan-don't-do; reversed and closed 2026-08-23. The map ends at decisions; implementation consumes them once it closes.
- `name`/`autoComplete` passthrough props — deferred beyond v1 during grilling; re-arbitrated in [Arbitrate flagged accessibility conflicts](issues/08-arbitrate-flagged-a11y-conflicts.md): kept out as an *accepted* WCAG 1.3.5 Identify Input Purpose gap (v1 Fields never submit — no form layer in scope), revisited with a future forms-composition effort.
