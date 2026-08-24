# 14 — Select kind with static Options

Type: task
Status: ready-for-agent

## What to build

Add the `select` Field kind over a static array of **Options**, implementing the locked presentation policies:

- Placeholder is select-only, realized as a disabled ghost `<option value="">` mounted as the first child carrying `hidden={value !== ""}` — it labels the closed control while empty, drops out of the open dropdown after a value is chosen, and never pre-selects a real Option.
- A stale/unknown current value (not among the resolved Options) renders a synthetic disabled entry carrying the raw value, plus a dev-only console.warn — display always equals parent state.
- A currently-selected-but-disabled Option is legal by default: `keepDisabledSelection` defaults to true and renders it selected; setting false demotes it to the stale/raw-value fallback instead. Accepted consequence of demotion: deselecting means the user cannot re-pick it.

Validation reuses the existing machinery (`required` over Empty; other rules ignore-and-warn on this kind).

Full decisions: the Field spec (`../spec.md`).

Blocked by: 11 — Input & textarea Field with required + Touched lifecycle (tracer bullet).

## Acceptance criteria

- [ ] Static `Option[]` render as choices; picking one hands the Option's value to the change callback
- [ ] Ghost option: shown while empty, hidden once a value is chosen, never pre-selects a real Option; `placeholder` configures it and is ignored by non-select kinds
- [ ] Stale/unknown value renders the raw-value fallback entry and logs a dev-only warn
- [ ] Held disabled Option stays selected under default `keepDisabledSelection`; `false` demotes it to the fallback display
- [ ] While a value is empty, the closed select shows the placeholder rather than preselecting anything
- [ ] Tests pin ghost-option, stale-fallback, and keepDisabledSelection behaviors at the public seam; demo page gains a select section; lint and typecheck green
