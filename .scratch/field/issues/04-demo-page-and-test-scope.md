# Demo page and test scope

Type: grilling
Status: resolved

## Question

Two scope decisions before building:

1. Does Field get a demo page at `app/field/` mirroring `app/table/local|server` — one page, or split static-options vs async-options demos?
2. Which behaviors must the vitest suite pin down as a minimum contract: number coercion matrix, touched lifecycle (silent → blur → change), async options pending/resolved/rejected, `handle.validate()` force-run, `onErrorChange` firing, multi-select toggle semantics?

## Answer

Resolved by grilling (2026-08-23).

1. **One demo page** at `app/field/page.tsx`. Table split into local/server routes because those are mutually exclusive runtime modes; static-vs-async options is one config dimension touching only two of five kinds. Page carries a section per kind plus an "Async options" section (select + multi-select on a loadable source) with a simulate-failure toggle, mirroring the server Table demo's error simulation.

2. **Error stays internal — no `onErrorChange` in v1.** The candidate prop was new API surface justified by no in-scope consumer: `CONTEXT.md` locks "validation feedback is managed inside the Field", the submit-time need is met by `FieldHandle.validate()`'s return value, and forms composition (where live per-field validity matters) is out of scope. A future forms-composition effort coins the term if it needs live validity. "onErrorChange firing" struck from the test contract.

3. **Number input coerces (decision a).** The change callback hands the parent: a `number` via `Number(raw)` when non-empty and parseable; `""` when empty (whitespace-only trims to this); `NaN` for non-empty garbage — and `NaN` counts as Empty per [Validator on boolean and the definition of empty](02-validator-boolean-and-empty.md)'s handoff to [Implement Field](05-implement-field.md), so `required` catches it and `min`/`max` skip evaluation. Kept out of `CONTEXT.md` as runtime artifact, same call as ticket 02.

4. **First blur evaluates and reveals.** Pristine invalid → silent; first blur marks Touched *and* runs the Validator immediately; every later change re-evaluates; fixing clears immediately. Strict reading of the Error term ("produced by the Validator once the Field is Touched"); avoids the stale window where a tabbed-through field looks valid though focus has left it.

5. **Minimum vitest contract — ten items:**
   1. Number coercion matrix: `""`/whitespace-only → Empty; `"42"` → 42; `"-3.5"` → -3.5; `"007"` → 7; `"1e3"` → 1000; `"abc"` → NaN → Empty, `min`/`max` skipped.
   2. Touched lifecycle per decision 4.
   3. Async options: mount fires loader → Pending (control disabled, "Loading options…", selection stays visible); resolved → enabled, Options render; Rejected → "Couldn't load options." + Retry button re-fires the loader.
   4. `handle.validate()` force-runs regardless of Touched, shows the Error, returns false invalid / true valid.
   5. Multi-select toggle semantics: checkbox row adds/removes membership in the value array; Chip appears/disappears in step; Chip remove-button removes; search filters rows.
   6. Non-applicable Validator rule → ignored + dev-only warn naming field and rule ([ticket 02](02-validator-boolean-and-empty.md)).
   7. Stale/unknown value → raw-value fallback display + dev warn ([ticket 01](01-select-presentation-policies.md)).
   8. Select ghost option: shown while empty, hidden once a value is chosen, never pre-selects a real Option ([ticket 01](01-select-presentation-policies.md)).
   9. `keepDisabledSelection`: held disabled Option renders selected by default; `false` demotes it to the stale fallback ([ticket 01](01-select-presentation-policies.md)).
   10. DOM/a11y floor ([ticket 03](03-accessibility-dom-contract.md), [ticket 08](08-arbitrate-flagged-a11y-conflicts.md)): error `<p>` always mounted with `aria-live="polite"`; `aria-invalid` only on failure; `describedby` orders hint→error; required marker `*` + visually-hidden "(required)"; `aria-required` on a required checkbox.

   Deliberately excluded from the floor: `onErrorChange` (dead per decision 2); multi-select popup ARIA specifics (un-arbitrated — owned by [Multi-select popup accessibility contract](06-multi-select-popup-a11y.md)); Pending/Rejected visual styling (owned by [Hint and status visuals](07-hint-and-status-visuals.md)).
