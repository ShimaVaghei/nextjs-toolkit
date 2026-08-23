# Wayfinder map: Field component

Label: wayfinder:map

## Destination

The reusable `Field` component shipped — `components/Field.tsx` with tests and a demo page — implementing exactly the Form terms locked in `CONTEXT.md` (Field, Field kind, Input type, Option, FieldConfig, Validator, Touched, Error, FieldHandle).

## Notes

- Every component-level design decision was locked in a grilling + domain-modeling session (2026-08-23); the canonical vocabulary and decisions live in `CONTEXT.md`, section "Form terms". Zoom there before any ticket.
- Consult `/domain-modeling` in any session that coins or sharpens terms; update `CONTEXT.md` inline as terms resolve.
- Standing preferences: config-object API mirroring `TableConfig`; no external libraries; Tailwind with dark-mode variants; vitest + testing-library specs beside the component; demo pages under `app/<component>/`.
- **Plan-don't-do override**: the implementation itself rides in this map as the final ticket, by explicit owner decision — every other ticket still resolves a decision, not a deliverable.

## Decisions so far

<!-- one line per closed ticket: name-linked, one-line gist -->

- [Accessibility and DOM contract](issues/03-accessibility-dom-contract.md) — always-mounted `aria-live="polite"` error `<p>` + describedby (hint→error order) + `aria-invalid` on failure only; `fieldset`/`legend` for multi-select; per-kind attribute checklist done. Two conflicts flagged for the human: required-marker wording, and the deferred-`autoComplete` WCAG 1.3.5 gap.

## Not yet specified

- Whether the hint/error/loading visual states need a cheap `/prototype` pass once the select presentation policies land — judge after that ticket resolves.
- Whether to record an ADR for the hand-rolled-no-form-library trade-off — offered twice in grilling, never confirmed; decide before the map closes.

## Out of scope

- Forms composition layer: multi-field forms, submit orchestration, form-level validation, dirty-state tracking — the destination ends at the single component.
- `name`/`autoComplete` passthrough props — explicitly deferred beyond v1 during grilling.
