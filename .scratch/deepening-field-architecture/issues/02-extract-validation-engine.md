# 02 — Extract the validation engine into lib/field-validation.ts

Status: ready-for-agent
Blocked by: 01
Spec: `../spec.md` (see "Validation engine (step 2)" under Implementation Decisions)

## Task

Move the pure validation engine out of `components/Field.tsx` (~lines 404–873: `Constraint`, `isConstraintPair`, `unpack`, `ruleFits`, `isEmpty`, `evaluate`, default messages, `RULE_NAMES`) into `lib/field-validation.ts`. Public interface: exactly `evaluate(kind, validator, value, touched) → string | null` and `isEmpty(value) → boolean`. Everything else stays private. Runtime-dispatched signatures, no generics — per-kind compile-time safety stays at the Field config-type edge.

## Steps

1. Move `FieldValidator` and the per-rule types (`FieldRequiredRule`, `FieldMinRule`, etc.) into the lib; re-export them from `Field.tsx` so existing imports don't break. `FieldKind` stays in Field and is imported by the lib (or passed as a string union shared via the lib — prefer moving `FieldKind` to the lib and re-exporting if it avoids a cycle).
2. Export only `evaluate` and `isEmpty`.
3. Port rule-semantics tests from `Field.test.tsx` into new DOM-free `lib/field-validation.test.ts`: per-kind Empty rules, Touched gating, rule-kind fit, default and custom message resolution.
4. Apply the split rule to Field tests: a test stays in `Field.test.tsx` if it would still pass with `evaluate` stubbed to a constant (wiring test); if it asserts message text or rule outcomes, its value moves to the lib suite. **Review the inventory with the user before deleting anything.**
5. Run `pnpm test`, `pnpm lint`, and `npx tsc --noEmit`.

## Acceptance

- `lib/field-validation.ts` exports exactly `evaluate` and `isEmpty` (plus moved types).
- Field renders and wires identically; wiring tests untouched and green.
- Rule-semantics tests run DOM-free and green.
- No behavior change; full suite green.
