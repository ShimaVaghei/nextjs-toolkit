# Validator on boolean and the definition of empty

Type: grilling
Status: resolved

## Question

Close the remaining Validator semantics per kind:

1. What does `required` mean for the `checkbox` kind — must `false` be treated as empty (the consent-checkbox pattern), or does required not apply to checkbox?
2. Are non-applicable rules silently ignored (e.g., `min`/`max` on a text input), or should the types reject them where feasible?
3. Finalize "empty" per kind in `CONTEXT.md`: `""`, `null`, `undefined`, empty arrays — and whatever #1 decides for booleans.

## Answer

Resolved by grilling (2026-08-23); glossary updated in `CONTEXT.md` — `Validator` rewritten and new term **Empty** coined.

1. **`required` × checkbox — `false` counts as Empty.** On a checkbox, `required` means the box must be ticked (the consent-checkbox pattern). Mirrors HTML5 native behaviour (`required` on `<input type=checkbox>` demands checkedness). Consistent with the ticket 03 checklist, which already wires `aria-required` directly onto the checkbox input.
2. **Non-applicable rules — ignored, with a dev-only warn.** `FieldConfig` stays flat (no discriminated union; mirrors the loose `TableConfig` style and keeps dynamically-built configs ergonomic). A rule landing on a kind it doesn't fit is skipped at runtime with a dev-only `console.warn` naming the field and the rule — the same contract-violation pattern ticket 01 set for stale values.
3. **Empty finalized per kind** (now the **Empty** term in `CONTEXT.md`):
   - every kind: `""`, `null`, `undefined`
   - multi-select: plus `[]` (already locked in the old Validator wording)
   - checkbox: plus `false` per decision 1
   - textual kinds (`input`/`textarea`) trim before testing, so whitespace-only strings count as Empty; trimming never alters the stored value

Implementation edge handed to [Implement Field](05-implement-field.md): a number input yielding `NaN` should be treated as Empty too (min/max cannot evaluate it) — left out of the glossary as a runtime artifact, not domain language.
