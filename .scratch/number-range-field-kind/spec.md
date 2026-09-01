Status: ready-for-agent

# Spec: `number-range` Field kind

## Problem Statement

Callers of the Field system cannot ask a user for a numeric range. A pair of independent number inputs forces the caller to hand-roll ordering rules, emptiness semantics, and validation wiring, and gives no shared contract for what a half-filled or out-of-order pair means. The Table's filter story will eventually need a numeric-bounds control, but today nothing in the Field vocabulary can produce one.

## Solution

A new Field kind, `number-range`: a single Field that renders two adjacent number inputs (From and To) and commits a Range value of numbers (`{ from?, to? }`). It behaves exactly like the existing range kinds — ends are individually optional (open-ended ranges are expressible), out-of-order ends are silently swapped so `from ≤ to` always holds, `required` demands both ends, and a half-filled range counts as empty. Callers get it through the same plain-data config + wrapper component + imperative `FieldHandle` contract as every other kind.

## User Stories

1. As an app developer, I want a `NumberRangeField` wrapper component, so that I can add a numeric-bounds control to a form with the same plain-data config contract as every other Field kind.
2. As an app developer, I want the committed value shaped as `{ from?: number; to?: number }`, so that my domain code receives the same range shape as date-range Fields.
3. As an app developer, I want out-of-order bounds (from > to) swapped automatically on commit, so that I never have to defend against an unordered range downstream.
4. As an app developer, I want each bound optional, so that open-ended ranges (e.g. "at most 100") are first-class values.
5. As an app developer, I want a cleared number-range Field to hold `undefined`, so that emptiness has one canonical representation like every other kind.
6. As an app developer, I want `required` on a number-range Field to demand both ends, so that "required" means the same thing on every range kind: the range is complete.
7. As an app developer, I want a half-filled range to count as Empty, so that `required` catches it with the built-in copy unless I supply my own message.
8. As an app developer, I want each bound edited through the same number-coercion matrix as a number `input` Field, so that empty strings and garbage never leak into my value as strings.
9. As an app developer, I want the generic `validator` (required, min, max) to work on the kind, so that I don't need kind-specific validation APIs.
10. As an app developer, I want `min`/`max`/`step` passed through to both inputs as presentation attributes, so that browsers constrain raw typing without new config concepts.
11. As an app developer, I want fixed From/To placeholders with no config surface for them, so that the Field teaches its value shape without config bloat.
12. As an app developer, I want the hint text to span the pair as one labelled control, so that the two inputs read as a single Field for accessibility and screen readers.
13. As an app developer, I want a `FieldHandle` typed to the range value via `ref`, so that I can `getValue()`/`setValue()`/`validate()` imperatively exactly like other kinds.
14. As an app developer, I want `setValue()` to run installs through the same pipeline as user edits (swap, normalize, observer, error re-evaluation), so that imperative and user-driven changes are indistinguishable.
15. As an app developer, I want the kind registered in the Field vocabulary type, so that the wrapper and config types compose type-safely with `FieldValueOf`.
16. As an end user, I want the two inputs labelled From and To, so that I know which bound I'm editing.
17. As an end user, I want a half-filled range to be accepted, so that I can leave an end blank without the Field shouting at me unless it's required.
18. As an end user, I want out-of-order numbers reordered rather than an error, so that entering "50 then 10" just works.
19. As a maintainer, I want the range semantics (swap, emptiness, required) expressed once and reused, so that `number-range` cannot drift from the date range kinds' behavior.
20. As a maintainer, I want the demo page to show the kind alongside the other range examples, so that the kind's contract is visible and exercised manually.
21. As a future Table integrator, I want the kind to emit a plain range object, so that a later number-range Table filter can consume it without reshaping.

## Implementation Decisions

- A new `FieldKind` member `"number-range"` joins the Field vocabulary. No caller ever writes the kind literal; a new per-kind wrapper component stamps it and exposes a kindless config alias, per the established wrapper convention.
- The value type is `FieldNumberRangeValue = { from?: number; to?: number }`, mirroring the existing date range value shape but numeric. It joins the top-level Field value union, and the kind's value mapping resolves to it.
- **Range swap invariant (Range swap in the glossary):** when both bounds are present and `from > to`, the ends are swapped during the commit pipeline. This matches the date range kinds exactly — coercion, never an ordering error. The decision to swap (rather than error, as initially proposed during design) was made for cross-kind consistency; this is the one deliberate deviation from the original proposal and is worth remembering.
- **Emptiness and required:** the emptiness predicate treats any missing bound on the kind as Empty, matching the date kinds. Therefore `required` demands both ends. A partial range (`{ from }` alone) is a legitimate committed value on non-required Fields and is normalized to `undefined` only when it has no bounds at all.
- **Coercion:** each bound's edit runs through the same numeric coercion matrix used by number `input` Fields: empty string becomes the empty sentinel, non-numeric garbage becomes NaN, which counts as Empty at validation time.
- **Rendering:** the kind renders inline — two adjacent `type="number"` inputs with accessible From/To labels and fixed default placeholders ("From" / "To", not configurable). The shared hint renders once for the pair; there is no popup and no slider.
- **Validation surface:** no new validator rules. The existing generic validator applies; `min`/`max` constraints may be passed through as HTML presentation attributes on both inputs. Richer per-bound rules are deliberately deferred until a use case exists.
- The shared Field engine (value ownership, Touched lifecycle, observer stream, `FieldHandle`) is reused untouched; the kind plugs into the existing commit pipeline alongside the date kinds.
- Demo page: one new example following the existing range examples, exercising partial ranges and required messaging.
- Documentation: the Field terms section of the domain glossary records Field, Field kind, Range value, Range swap, and Number range field.

## Testing Decisions

- **Good tests assert external behavior only:** what value the Field commits after DOM interaction, what error message shows when Touched, what the handle returns — never internal state or render structure.
- **Two existing seams, no new ones:**
  1. **The `NumberRangeField` wrapper** (highest seam): render, type into From/To, assert committed values, swap behavior, partial-range commits, required messaging, and handle get/set — mirroring the existing "engine value model" suites for the date range wrappers in the Field component tests.
  2. **The pure validation module:** emptiness and error evaluation for the new kind, mirroring the existing "range kinds" cases in the validation module's tests.
- Prior art: the date-range wrapper's engine-value-model describe blocks (swap, undefined ends, coercion) and the validation tests' range-kind cases ("tests from/to on range kinds", "counts coerced NaN as Empty").

## Out of Scope

- Table integration: no number-range Table filter, no change to the Table data request or filter value vocabulary (non-scalar filters remain reserved for a later feature).
- Dual-thumb sliders, popup-based editing, or any other presentation beyond the two inline inputs.
- Configurable per-bound placeholders or per-bound validator rules.
- Cross-field validation or any coupling between separate Fields.

## Further Notes

- The from/to wording (vs min/max) is deliberate: the value keys are `from`/`to` and the placeholders teach that shape.
- A future follow-up can extend the emptiness/normalization pipeline if the Table filter work needs object filter values; nothing in this spec blocks it.
