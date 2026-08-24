# 14 — Select kind with static Options

Type: task
Status: resolved

## What to build

Add the `select` Field kind over a static array of **Options**, implementing the locked presentation policies:

- Placeholder is select-only, realized as a disabled ghost `<option value="">` mounted as the first child carrying `hidden={value !== ""}` — it labels the closed control while empty, drops out of the open dropdown after a value is chosen, and never pre-selects a real Option.
- A stale/unknown current value (not among the resolved Options) renders a synthetic disabled entry carrying the raw value, plus a dev-only console.warn — display always equals parent state.
- A currently-selected-but-disabled Option is legal by default: `keepDisabledSelection` defaults to true and renders it selected; setting false demotes it to the stale/raw-value fallback instead. Accepted consequence of demotion: deselecting means the user cannot re-pick it.

Validation reuses the existing machinery (`required` over Empty; other rules ignore-and-warn on this kind).

Full decisions: the Field spec (`../spec.md`).

Blocked by: 11 — Input & textarea Field with required + Touched lifecycle (tracer bullet).

## Acceptance criteria

- [x] Static `Option[]` render as choices; picking one hands the Option's value to the change callback
- [x] Ghost option: shown while empty, hidden once a value is chosen, never pre-selects a real Option; `placeholder` configures it and is ignored by non-select kinds
- [x] Stale/unknown value renders the raw-value fallback entry and logs a dev-only warn
- [x] Held disabled Option stays selected under default `keepDisabledSelection`; `false` demotes it to the fallback display
- [x] While a value is empty, the closed select shows the placeholder rather than preselecting anything
- [x] Tests pin ghost-option, stale-fallback, and keepDisabledSelection behaviors at the public seam; demo page gains a select section; lint and typecheck green

## Answer

Implemented in `components/Field.tsx`. `FieldKind` gains `"select"`; config gains `options?: Option[]`, select-only `placeholder?: string`, and `keepDisabledSelection?: boolean` (default true). `Option` is `{ label: string; value: string; disabled?: boolean }`.

Presentation policies as locked: an always-mounted disabled ghost `<option value="">` sits first with `hidden={rawValue !== ""}` (labels the closed control while empty, leaves the open dropdown after a choice, never preselects a real Option — it also guarantees `value=""` resolves while empty even when no placeholder is set). A stale/unknown current value renders a synthetic disabled entry carrying the raw value plus a dev-only warn naming field and value; empty is never stale. Demotion via `keepDisabledSelection: false` swaps only the held disabled Option for the raw-value fallback in place — other choices stay pickable so deselection remains possible. Validation reuses the machinery untouched: `required` over Empty works; every other rule already fails `ruleFits` for select and ignore-warns.

Tests pinned at the public seam in `components/Field.test.tsx` (options/choice handoff, Touched lifecycle, ignored textual rule warn, ghost shown/hidden, placeholder ignored by non-selects, stale fallback + warn + quiet-while-empty, keep vs demote). Demo page `/field` gains a Select section (required country select with placeholder + disabled option; legacy-plan select holding a retired option under default `keepDisabledSelection`). Lint clean (one pre-existing Table warning), typecheck green, vitest 214/214.

## Comments

2026-08-24 code review (standards + spec axes), both clean of hard violations. Noted for follow-up: (1) the shared `isEmpty` trims strings on every kind, so a parent-injected `" "` select value counts as Empty — unreachable through real UI since select values come from Options; revisit if the Empty glossary entry is ever tightened per-kind. (2) The kind-dispatch ternaries in `handleChange`/render multiply with each new Field kind — candidate for extraction when multi-select lands.
