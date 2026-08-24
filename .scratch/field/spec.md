# Spec: Field component

Status: ready-for-agent

Synthesized 2026-08-24 from the fully-resolved wayfinder map `.scratch/field/map.md` (grilling, research, and prototype sessions of 2026-08-23) and the Form terms locked in `CONTEXT.md`.

## Problem Statement

Building a single labeled form control today means hand-wiring the label↔control association, validation feedback, error announcement, and styling every time — and getting accessibility right each time is easy to fumble. The toolkit already ships a reusable Table driven by one config object; forms have no equivalent, so every form control in an app built on this toolkit reinvents its own plumbing, and consistency across controls is accidental rather than guaranteed.

## Solution

A reusable client-side **Field** component that renders exactly one labeled form control — chosen from the five Field kinds (`input`, `textarea`, `select`, `multi-select`, `checkbox`) — driven entirely by a **FieldConfig** object, mirroring how TableConfig drives Table. Declarative **Validator** rules give instant, accessible feedback managed inside the Field (controlled value, parent owns data; Field owns validation UX). Choice kinds accept static or async-loaded **Options**, including load-failure recovery via Retry. The multi-select renders selections as removable Chips inside a fixed-height horizontally-scrolling control with a searchable popup. Every interaction works for keyboard and screen reader users out of the box, in light and dark modes, with zero external libraries. A demo page exercises every kind, including simulated async failure.

## User Stories

### Configuring and rendering

1. As an app developer, I want to render one labeled form control from a single `FieldConfig`, so that I never hand-wire label/control/hint/error plumbing again.
2. As an app developer, I want all five Field kinds (`input`, `textarea`, `select`, `multi-select`, `checkbox`) behind one component API, so that every control in my forms behaves and looks consistently.
3. As an app developer, I want to narrow an input Field by Input type (`text`, `email`, `password`, `number`), so that I get the right HTML semantics and keyboard without extra props.
4. As an app developer, I want the Field to be controlled — value in my state, changes flowing back through a single change callback — so that my data stays the source of truth while the Field owns validation UX.
5. As an app developer, I want presentation props (label, hint, placeholder, disabled, className) in the same config, so that one object fully describes the control.
6. As an app developer, I want a hint line rendered beneath the label, so that I can give contextual guidance without inventing markup.

### Validation

7. As an app developer, I want declarative Validator rules (`required`, numeric `min`/`max`, textual `minLength`/`maxLength`/regex`) in the config, so that common constraints need no custom logic.
8. As an app developer, I want each rule to accept either a bare constraint (built-in default message) or a `{ value, message }` pair, so that I only write copy where I care.
9. As an app developer, I want rules that don't fit the configured kind ignored with a dev-only warning naming the field and rule, so that dynamically-built configs stay ergonomic instead of crashing.
10. As an app developer, I want `required` on a checkbox to mean must-tick (`false` counts as Empty), so that the consent-checkbox pattern just works.
11. As an app developer, I want whitespace-only input to count as Empty for textual kinds (without altering the stored value), so that users can't bypass `required` with spaces.
12. As a user typing into a pristine field, I want no error shouted while I'm still working, so that feedback appears only after I've left the control once (first blur evaluates and reveals).
13. As a user who has left the control, I want every subsequent change re-evaluated immediately, so that fixing my value clears the Error at once.
14. As a user seeing an Error, I want exactly one message shown at a time, so that feedback stays readable instead of stacking.
15. As an app developer submitting programmatically, I want a ref handle exposing `validate()` that force-runs every rule regardless of Touched, shows any Error, and returns validity, so that submit-time gating doesn't depend on blur history.
16. As an app developer using a number input, I want the change callback to receive a real number when parseable, `""` when empty, and `NaN` (counted as Empty) for garbage, so that numeric validation works without my own coercion layer.

### Select and multi-select

17. As an app developer, I want to pass Options as a static array or an async loader, so that both known choices and server-sourced ones fit one shape.
18. As a user waiting for options to load, I want the control disabled with a muted "Loading options…" status while my existing selection stays visible, so that I understand why choosing is blocked.
19. As a user whose option load failed, I want a "Couldn't load options." status with a Retry button that re-fires the loader, so that a transient failure isn't fatal.
20. As an app developer, I want a stale/unknown current value rendered as a raw-value fallback plus a dev-only warning, so that the display always equals my state even if options changed underneath.
21. As an app developer holding a currently-selected-but-disabled Option, I want it to stay legally selected by default (`keepDisabledSelection`, default true) — or demoted to the stale fallback when set false, so that data written before an Option was disabled doesn't silently vanish.
22. As a user of a select Field, I want a placeholder shown via a ghost option while empty — which drops out of the dropdown once a value is chosen and never pre-selects a real Option — so that "nothing chosen yet" is honest.
23. As a user of a multi-select Field, I want my selections shown as removable Chips inside a fixed-height control that scrolls horizontally (never grows), so that long selections can't blow up the layout.
24. As a user removing a Chip, I want focus to move to the neighbouring chip's remove button (or the open button when none remain), so that rapid removals don't dump me on `<body>`.
25. As a user opening the multi-select popup, I want a search box above labelled checkbox rows, so that I can filter long option lists quickly.
26. As an app developer, I want `placeholder` to be select-only (multi-select ignores it), so that the multi-select face isn't polluted by a dead prop.

### Accessibility

27. As a screen reader user, I want every label programmatically associated with its control, so that I hear which field I'm on.
28. As a screen reader user, I want errors announced through an always-mounted polite live region referenced by `aria-describedby` (hint first, error last), with `aria-invalid` present only while failing and a visually-hidden "Error:" prefix inside the message, so that failures reach me politely, in context, and never by color alone.
29. As a screen reader user, I want a required field marked by `*` plus a visually-hidden "(required)" (and `aria-required`, directly on the checkbox for checkbox Fields), so that requiredness is conveyed non-visually, not by an unexplained asterisk.
30. As a screen reader user, I want the multi-select popup to be a disclosure-style trigger named by the visible field label (never content-computed), opening focus onto the search input, with Escape returning focus to the open button, no focus trap, and pointer outside-click closing without moving focus, so that the widget matches the interaction model I know from other popups.
31. As a screen reader user, I want the popup's checkbox rows grouped under a `fieldset`/`legend` as native checkboxes — never `role=option` wrappers — so that toggles announce natively and group membership is clear.
32. As a screen reader user, I want chip removals from the closed face announced as "Removed X. N selected." through the shared polite region, so that removals done outside the panel still give feedback; in-panel toggles stay silent to avoid double-speak.
33. As a keyboard-only user, I want every Field kind fully operable by keyboard — Tab reaches the open button and each chip's remove button, Space toggles checkboxes, Enter opens the popup — so that mouse-free use is complete.
34. As a user browsing dark mode, I want hint/status/Error tones to hold their contrast in both themes, so that feedback never disappears.

### Delivery

35. As a maintainer, I want the ten-item minimum vitest contract pinned against the public component boundary, so that future refactors can't silently break coercion, lifecycle, async, or accessibility behavior.
36. As an app developer evaluating the toolkit, I want a demo page exercising every kind plus an async section with a simulate-failure toggle, so that I can see and poke all states before adopting.
37. As a maintainer, I want the whole feature built with no external form/component libraries and pure Tailwind styling, so that dependencies stay flat and the codebase remains ours to fix.

## Implementation Decisions

- **One new client-side component module** exports `Field`, the `FieldConfig` type family (`FieldKind`, `InputType`, `Option`, `Validator`, `FieldHandle`). Flat config object — no discriminated union per kind — mirroring the loose `TableConfig` style; non-applicable Validator rules are skipped at runtime with a dev-only `console.warn` naming field and rule.
- **Controlled component**: `value` lives in the parent; all changes flow back through one change callback; validation feedback is managed inside the Field. Imperative `FieldHandle` via `ref` exposes a single `validate()` (force-runs rules regardless of Touched, shows any Error, returns boolean).
- **Empty definition** (what `required` rejects): `""`/`null`/`undefined` on every kind; `[]` for multi-select; `false` for checkbox (consent pattern); textual kinds trim before testing without altering the stored value; a number input's `NaN` counts as Empty at runtime (so `required` catches it and `min`/`max` skip evaluation) — kept out of glossary as a runtime artifact.
- **Number coercion**: change callback receives `Number(raw)` when non-empty and parseable, `""` when empty/whitespace-only, `NaN` otherwise.
- **Touched lifecycle**: pristine invalid values stay silent; first blur marks Touched *and* runs the Validator immediately; afterwards every change re-evaluates; fixing clears the Error instantly. At most one Error visible at any time. No `onErrorChange` prop in v1 (no in-scope consumer; submit-time need met by `validate()`'s return value).
- **Options**: static array or loader function (`() => Promise<Option[]>`) accepted. Loader fires on mount → Pending → Resolved/Rejected; Retry re-fires the loader (no other retry API). During Pending/Rejected the control stays disabled, any selection stays visible, and status lines render in the persistent hint slot: muted "Loading options…"; "Couldn't load options." beside a small Retry button in destructive tone that is deliberately *not* Error styling (no `aria-invalid`, error slot untouched). The popup interior never shows loading states — it only opens on resolved options.
- **Stale/unknown value**: rendered as a synthetic disabled entry carrying the raw value (extra option for select; fallback-labelled Chip for multi-select) plus a dev-only warn. While a load is Pending, absence is expected, not stale.
- **`keepDisabledSelection` flag** (default `true`): a held disabled Option renders selected; `false` demotes it to the stale fallback. Accepted consequence: deselecting means the user cannot re-pick it.
- **Select**: placeholder is select-only, realized as an always-mounted disabled ghost first `<option>` hidden after a value is chosen; never pre-selects a real Option; no `aria-busy`.
- **Multi-select = custom popup** (supersedes flat checkbox rows): closed face is a labelled container (`role="group"` named via `aria-labelledby` → visible field label) of real removable Chips (each × carries `aria-label="Remove <option label>"`) plus one separate adjacent open button carrying `aria-expanded`/`aria-controls` and `aria-label="Show options"` — composite face chosen over single-trigger-with-inert-chips because HTML forbids nested interactive controls; tap-to-remove survives everywhere. Panel: labelled search input filtering resolved Options client-side (filtered rows removed from rendering, not clipped), above a `fieldset`/`legend` group of native labelled checkboxes. No combobox/listbox roles anywhere, no `aria-haspopup`, no focus trap.
- **Focus choreography**: open moves focus to the search input; Escape returns it to the open button; Tab-out closes naturally; pointer outside-click closes without moving focus; removing the focused Chip hops focus to the neighbouring × (last chip if it was last, open button if none remain); active focus never rests on a removed node.
- **Announcements**: one always-mounted `aria-live="polite"` region per Field. Closed-face chip removals announce "Removed X. N selected."; in-panel toggles stay silent (native checked-state announcement suffices); last message wins, never assertive.
- **DOM/a11y contract**: always-mounted error `<p id>` with polite live semantics, referenced by the control's `aria-describedby` ordered hint→error (both nodes never conditionally unmounted); `aria-invalid` only while an Error shows; `aria-required` wired; required marker renders `*` plus visually-hidden "(required)" wherever requiredness appears; visually-hidden "Error:" prefix inside error text; explicit `htmlFor`/`id` association (label right of the box for checkbox; no wrapping-label); `disabled` omitted entirely when enabled; no `aria-errormessage`; no `name`/`autoComplete` wiring.
- **Visuals (prototype verdict B)**: hint, Pending, Rejected+Retry, and Error stack below the control as compact lines; controls sit `mt-1.5` under the label; muted spinner (pure-Tailwind `animate-spin`) for Pending; semibold red Error; slim styled horizontal scrollbar (~4px rounded thumb, transparent track) on the chip strip — hidden-scrollbar-with-fades prototyped and rejected. Dark-mode variants required for every tone. Tailwind only; no external libraries.
- **Demo page** at route `/field`: one page, a section per Field kind plus an "Async options" section (select + multi-select on a loadable source) with a simulate-failure toggle, mirroring the server-mode Table demo's error simulation. Throwaway prototype routes from the research branches are not carried forward.

## Testing Decisions

- **Good tests assert external behavior only**: what a user (or screen reader) perceives and what the parent receives — rendered DOM/ARIA output, change-callback arguments, `validate()` return values, dev-warn calls, focus movement. No internal state inspection, no implementation-detail queries; interactions go through role/label-based queries.
- **Single public seam** (confirmed by owner): every test renders the Field through its public interface — `FieldConfig` plus `ref` — exactly like the existing Table suite drives `TableConfig`/`TableHandle`. No exported validation helper, no extracted hooks, no additional seams.
- **Minimum contract — ten items** (from the demo/test-scope decision):
  1. Number coercion matrix (`""`/whitespace → Empty; `"42"` → 42; `"-3.5"` → -3.5; `"007"` → 7; `"1e3"` → 1000; `"abc"` → NaN → Empty with `min`/`max` skipped).
  2. Touched lifecycle (silent pristine → first blur evaluates and reveals → changes re-evaluate → fix clears).
  3. Async options (mount fires loader → Pending disables control with "Loading options…", selection stays visible → resolved enables → Rejected shows "Couldn't load options." + working Retry).
  4. `handle.validate()` force-runs regardless of Touched, shows the Error, returns false invalid / true valid.
  5. Multi-select toggle semantics (checkbox row adds/removes membership; Chip appears/disappears in step; Chip remove-button removes; search filters rows).
  6. Non-applicable Validator rule → ignored + dev-only warn naming field and rule.
  7. Stale/unknown value → raw-value fallback + dev warn.
  8. Select ghost option (shown while empty, hidden after choice, never pre-selects a real Option).
  9. `keepDisabledSelection` (held disabled Option selected by default; `false` demotes to stale fallback).
  10. DOM/a11y floor (always-mounted polite error `<p>`; `aria-invalid` only on failure; `describedby` orders hint→error; required marker `*` + visually-hidden "(required)"; `aria-required` on a required checkbox).
- Since those ten items were pinned, the multi-select popup arbitration closed — so the suite also pins the now-decided popup behavior at the same seam: disclosure trigger naming/expanded state, focus choreography (open→search, Escape→open button, removal focus-hop), and the closed-face removal announcement.
- **Prior art**: `components/Table.test.tsx` — config-builder helper, role/name queries, `fireEvent`/`user-event`-style interaction, fake timers/promises for async loaders, `vi.spyOn(console, "warn")` for dev-warn assertions, `createRef` for the imperative handle. Vitest + @testing-library/react under jsdom; specs live beside the component.
- The demo page is a manual verification surface, not a test target.

## Out of Scope

- **Forms composition layer**: multi-field forms, submit orchestration, form-level validation, dirty-state tracking — the destination ends at the single component. Live per-field validity callbacks (`onErrorChange`) die with it; a future composition effort coins terms if it needs them.
- **`name`/`autoComplete` passthrough** — kept out as an *accepted* WCAG 1.3.5 Identify Input Purpose gap (v1 Fields never submit), revisited with a future forms-composition effort.
- **Roving-tabindex compaction** of chip Tab stops (N selections → N+1 stops is accepted v1 cost) — noted as a future refinement.
- **Arrow-key row navigation / type-ahead** in the popup — intentionally absent under the plain-checkbox-group model; the search field substitutes.
- **Any external form/component library** — standing preference; the machinery (popup, focus choreography, live regions) is hand-rolled.
- **The optional "no-form-library" ADR** — owned by open ticket 10, orthogonal to this build (see Further Notes).

## Further Notes

- Canonical vocabulary: the Form terms section of `CONTEXT.md` (Field, Field kind, Input type, Option, Chip, Pending, Rejected, FieldConfig, Validator, Empty, Touched, Error, FieldHandle). Use these words in code, comments, and UI copy; consult `/domain-modeling` before coining anything new.
- Every implementation decision above traces to a resolved ticket in `.scratch/field/issues/` (01–04, 06–09); the full multi-select attribute checklist with W3C citations lives at `.scratch/field/research/multi-select-popup-a11y.md`.
- Prototype artifacts were captured on throwaway branches (`research/multi-select-chip-placement`, `research/closed-face-chip-buttons`, `research/field-status-visuals`) — reference material only; do not merge them into the implementation branch.
- Open ticket [10 — Record the no-form-library ADR?](issues/10-record-no-form-library-adr.md) predates this spec: the hand-rolled trade-off has accumulated real machinery (popup, focus choreography, live-region announcements) and may warrant an ADR. Decide and resolve it independently; this spec builds either way with no external libraries.
- Done means: lint, typecheck, and the vitest suite green; demo page rendering at route `/field`; any newly coined term added to `CONTEXT.md`.
