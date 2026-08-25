# Spec: Field rework — internal value ownership, typed Options, unified controls

Status: ready-for-agent

## Problem Statement

Developers building forms with the Field component are forced to mirror every Field value in their own state (the component was strictly parent-controlled), even when they only want a simple self-contained field. Option values are hardcoded to strings, so handing a select a numeric id or a rich payload object means building string-mapping shims around the component. Email validation is only reachable by setting an `email` input type plus a hand-written regex. Exported type names are inconsistent (`Validator`, `Option`, `InputType` lack the prefix their siblings carry). Select is a native `<select>` that structurally cannot carry non-string values, popup rows have implicit click targets, and controls render at three different heights depending on kind.

## Solution

Field becomes the owner of its value: it seeds once from an optional Initial value at mount, handles every change internally, optionally notifies the parent through `onValueChange`, and exposes imperative read/write through its ref. Options become generically typed over an unbounded value type with a configurable Matching rule, and select is rebuilt as a custom disclosure sharing the multi-select's searchable popup so values never need stringification. Email becomes a declarative Validator rule. All exported Field types share the `Field` prefix. Popup rows are fully clickable in both choice kinds, and every control except textarea renders at one uniform height.

## User Stories

1. As a form builder, I want `kind` to be optional on FieldConfig and default to `"input"`, so a plain text field needs the smallest possible config.
2. As a form builder, I want each Field kind to constrain its own value shape (input: `string | number`; textarea: `string`; checkbox: `boolean`; select: `T`; multi-select: `T[]`), so TypeScript rejects mismatched values instead of failing at runtime.
3. As a form builder, I want FieldConfig to be generic over the kind, so narrowing flows through `initialValue`, `onValueChange`, and Options automatically once I declare a kind.
4. As a form builder, I want `value` handling replaced by a seed-once `initialValue`, so simple fields work without me maintaining mirrored state.
5. As a form builder, I want `initialValue` to accept undefined, so "no initial choice" is expressible for every kind including checkbox and multi-select.
6. As a form builder, I want `onValueChange` to be optional, so I only subscribe when I actually need change awareness.
7. As a form builder, I want `onValueChange` to fire for every value change regardless of source (user edit, programmatic set), so my observer sees one honest stream.
8. As a form builder, I want a dev-only warning when the `initialValue` prop changes after mount, so seed-once semantics can't silently swallow my update.
9. As a form builder, I want `getValue()` on the FieldHandle, so submit handlers can read current values without keeping shadow copies.
10. As a form builder, I want `setValue(next)` on the FieldHandle, so I can clear or repopulate fields programmatically (e.g., after a successful submit).
11. As a form builder, I want `setValue` to run the same pipeline as a user edit, so observers, Touched-aware error re-evaluation, and rendering stay consistent no matter who changed the value.
12. As a form builder, I want `validate()` kept on the FieldHandle, so submit-time forced validation continues to work unchanged.
13. As a form builder, I want an `email` rule on the Validator supporting bare boolean and `{ value, message }` forms, so email format checking is declarative with customizable copy.
14. As a form builder, I want `email` removed from InputType, so the browser's native email heuristics no longer interact with my validation strategy.
15. As a form builder, I want the `email` rule to apply only to non-number inputs, so it can't be meaninglessly attached to number inputs or textarea.
16. As a form builder, I want Option values of any type, so I can pass domain objects or numeric ids directly without string conversion layers.
17. As a form builder, I want users to always see Option labels rather than values, so internal representations never leak into the UI.
18. As a form builder holding selections keyed by object identity fields, I want an optional `matchValue(a, b)` override, so Matching can compare ids instead of references.
19. As a form builder, I want reference identity (`Object.is`) as the default Matching rule, so behavior is predictable without configuration when parent state holds actual Option values.
20. As a form builder reusing stale data, I want unmatched primitive values to render as their string form and non-primitives as a generic "(unknown option)" marker, so held-but-unmatched selections stay visible and honest.
21. As a form builder, I want Fallbacks to be inert and accompanied by a dev-only warning, so stale selections are diagnosable but never choosable.
22. As a form builder, I want all exported Field types prefixed with `Field` (e.g., `FieldValidator`, `FieldOption`, `FieldInputType`, `FieldMinRule`), so imports are consistent and predictable across the family.
23. As an end user, I want the entire popup row to be clickable in both select and multi-select, so hitting the label text selects as reliably as hitting the checkbox.
24. As an end user choosing from a select, I want the popup to close immediately after picking a row, so single-choice selection takes one click.
25. As an end user choosing several multi-select options, I want the popup to stay open while I toggle rows, so multi-picking doesn't require reopening.
26. As an end user facing a long option list, I want the shared search box in both popups, so I can filter down to my choice quickly.
27. As an end user, I want focus to move to the search box on open and return to the trigger on Escape/outside-click, so keyboard navigation stays coherent.
28. As an end user, I want all controls except textarea to share one uniform height, so my form grid aligns visually.
29. As an end user writing long text, I want textarea exempt from the fixed height (multi-row, vertically resizable), so extended writing stays comfortable.
30. As an end user on a checkbox Field, I want the box and label vertically centered inside the same uniform control row, so checkboxes align with neighbouring fields.
31. As a screen-reader user, I want chip removal announcements and polite live-region updates preserved, so closed-face multi-select changes stay announced.
32. As an end user with a disabled Option currently held, I want existing keepDisabledSelection semantics preserved, so my held selection isn't demoted unexpectedly.
33. As a developer integrating async options, I want the Pending/Rejected lifecycle with Retry preserved under the new dropdown, so load failure paths behave as before.
34. As a maintainer, I want the demo page migrated to the new contract, so every feature remains observable and manually verifiable in one place.

## Implementation Decisions

- **Generic mapped config**: `FieldConfig<K extends FieldKind = "input", T>` stays a single object type (not a discriminated union). An optional `kind` defaults to `"input"`; a kind-keyed mapping narrows the value types: input → `string | number`, textarea → `string`, checkbox → `boolean`, select → `T`, multi-select → `T[]`.
- **Internal value ownership**: the Field always owns its value. `initialValue` seeds internal state exactly once at mount (undefined allowed); afterwards the prop is ignored. A changed prop after mount triggers a dev-only warning. This deliberately departs from React's controlled-component convention.
- **Observer callback**: `onValueChange` becomes optional and observational — fired for every committed change regardless of whether it came from a user event or `setValue`.
- **Ref surface**: `FieldHandle = { validate(): boolean; getValue(): FieldValueOf | undefined; setValue(next): void }`. `setValue` updates internal state, fires the observer, and re-evaluates the Error when Touched.
- **Unbounded Option values**: `FieldOption<T>` has an unbounded `value: T`. Labels are always the rendered surface (rows, chips, closed face); values participate only in Matching.
- **Custom select**: select abandons the native `<select>` element entirely and becomes a disclosure trigger + shared popup. No value stringification exists anywhere in the pipeline.
- **Shared Options popup**: one popup implementation serves both choice kinds — search box filtering rows, focus-to-search on open, Escape/outside-click/focus-loss closing, query reset on close. Whole rows are clickable: select picks and closes; multi-select toggles membership and stays open. Disabled Options render inert everywhere.
- **Matching**: `Object.is` by default; optional `matchValue?: (a: T, b: T) => boolean` on FieldConfig overrides it. Matching drives closed-face resolution, popup checked states, chip membership, and staleness detection.
- **Fallback rendering**: a value Matching no Option (once options are authoritative) renders as `String(value)` for primitives, otherwise a generic "(unknown option)" marker; always inert, always paired with a dev-only console warning.
- **Email as a rule**: InputType narrows to `"text" | "password" | "number"`. The Validator gains `email?: boolean | { value: boolean; message: string }`, fitting non-number inputs only, evaluated in fixed precedence after maxLength and before regex, with default message "Enter a valid email address." Misplaced rules keep the existing dev-warn treatment.
- **Type renames**: all exported Field-family types take the prefix — `FieldInputType`, `FieldOption`, `FieldValidator`, `FieldRequiredRule`, `FieldMinRule`, `FieldMaxRule`, `FieldMinLengthRule`, `FieldMaxLengthRule`, `FieldRegexRule` — joining the already-prefixed `FieldKind`, `FieldValue` (mapping type), `FieldConfig`, `FieldHandle`.
- **Uniform control height**: one shared `h-11` applies to the input, the select closed-face trigger, the multi-select chip strip, and a new checkbox control row (box + label vertically centered). Textarea keeps its multi-row, resizable exemption.
- **Preserved semantics**: Empty definitions per kind, Touched lifecycle, Error single-message display, required-marker rendering, ghost placeholder on select's empty closed face, keepDisabledSelection demotion, Pending/Rejected/Retry option loading, chip strip overflow scrolling, polite removal announcements.
- **Domain vocabulary**: the repo glossary was updated during design to reflect this target state (Field ownership model, Initial value, FieldValidator, FieldOption, Select, Options popup, Matching, Fallback); implementation should read it as the naming authority.

## Testing Decisions

- Good tests exercise external behavior only: render the component, drive real interaction events, and assert on what a consumer observes — observer callbacks, rendered labels/chips/errors, and values returned through the ref. Internal state shape, effect ordering, and class-name plumbing are not asserted except where the class itself is the contract (uniform height).
- All tests live at the existing component seam: mount the component with a config object and optional ref, then interact. No page-level or unit-of-internals seams are introduced.
- Prior art: the existing Field test suite's patterns carry over — a config factory accepting partial overrides, a harness that pipes observer calls into local state, spy callbacks for change assertions, and ref-driven validate assertions. Existing suites for select staleness/fallback, disabled-option demotion, async Pending/Rejected/Retry, chip focus management, and Touched/error timing migrate rather than disappear.
- New coverage required: seed-once semantics (later prop changes ignored + dev-warn), fully-uncontrolled usage without observer, observer firing on `setValue`, `getValue` round-trips, per-kind value typing compile-level expectations (via typed test fixtures), unbounded-T options with object values, `matchValue` override, "(unknown option)" Fallback for object values, whole-row click toggling in both kinds, select pick-and-close, uniform height classes, and the `email` rule's fit/preference/custom-message matrix.

## Out of Scope

- Architecture Decision Records for the ownership model and custom select (explicitly declined this session).
- Configurable control heights (`controlHeight` prop) — the uniform height is an invariant, not a knob.
- Native `<select>` compatibility mode or stringification escape hatch for object values.
- Deep-equality or structural Matching beyond the single optional comparator.
- A `reset()` handle method — `setValue` with the original Initial value covers it.
- Form-level composition (multi-field coordination, submit orchestration) — Field remains a single-control component.
- Changes to any sibling component family (Table, navigation).

## Further Notes

- Migration ripple: the demo page and the existing ~1800-line test suite predate the renames and the ownership model; both migrate as part of implementation. Observer call sites simplify — per-kind typing removes today's defensive `String(...)`/`Array.isArray(...)` casts.
- The built-in email check needs a concrete default pattern; the demo page's long-standing hand-written regex is the working baseline unless a stricter one is chosen during implementation.
- The grilling session that produced this spec resolved ten original requests into the ledger above; where a request's wording ("value", "changeable via ref") evolved during questioning (`initialValue`, `setValue`), the ledger wording wins.
