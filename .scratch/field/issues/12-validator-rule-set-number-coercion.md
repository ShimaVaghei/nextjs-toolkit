# 12 — Full Validator rule set + number coercion

Type: task
Status: ready-for-agent

## What to build

Complete the **Validator**: numeric `min`/`max` apply only to number inputs; textual `minLength`/`maxLength`/`regex` apply only to input and textarea Fields. Every rule accepts either a bare constraint (built-in default message) or a `{ value, message }` pair (custom copy). A rule landing on a kind it does not fit is ignored with a dev-only console warning naming the field and the rule — the config stays flat.

Number inputs coerce on change: non-empty parseable → `Number(raw)`; empty/whitespace-only → `""`; non-empty garbage → `NaN`, which counts as Empty at runtime so `required` catches it and `min`/`max` skip evaluation. Finally, the submit-time story lands: the imperative `FieldHandle` obtained via `ref` exposes `validate()`, which force-runs every rule regardless of Touched state, shows any resulting Error, and returns whether the value is valid.

Full decisions: the Field spec (`../spec.md`).

Blocked by: 11 — Input & textarea Field with required + Touched lifecycle (tracer bullet).

## Acceptance criteria

- [ ] `minLength`/`maxLength`/`regex` enforce on input and textarea; `min`/`max` enforce on number inputs; each produces the single current Error when violated
- [ ] Bare constraints show built-in default messages; `{ value, message }` pairs show custom text
- [ ] A non-applicable rule is silently skipped functionally but logs a dev-only warn naming the field and the rule
- [ ] Number coercion matrix holds: whitespace-only → Empty; `"42"` → 42; `"-3.5"` → -3.5; `"007"` → 7; `"1e3"` → 1000; `"abc"` → NaN → Empty, with `min`/`max` skipping evaluation
- [ ] `validate()` force-runs rules regardless of Touched, reveals any Error, returns false invalid / true valid
- [ ] Tests pin the coercion matrix and the rule-warn behavior at the public seam; lint and typecheck green
