# Spec: Date & datetime Field kinds

Labels: ready-for-agent

Handoff spec consolidating the settled decisions of the `field-date-kinds` wayfinder effort (route in [`map.md`](map.md); detail in each linked ticket under [`issues/`](issues/)). Implementation happens outside wayfinder — e.g. an `/implement` run against this file.

## Problem Statement

The toolkit's Field architecture ships five kinds — text input, textarea, checkbox, select, multi-select — but nothing for collecting dates. An app developer who needs a birthday, a scheduled appointment, or a booking window must either reach for a raw native `<input type="date">` (which renders differently per browser, cannot express ranges, and stringifies its value opaquely) or hand-build a picker, wiring label presentation, validation feedback, and the Field value pipeline themselves — exactly the work Fields exist to absorb.

## Solution

Four new Field kinds on the single existing engine: **DateField**, **DateTimeField**, **DateRangeField**, and **DateTimeRangeField**, bringing the Field API to nine wrapper components. Each renders one labeled control whose closed face shows the picked value (or placeholder ghost) and opens a custom calendar popup — deliberately not a native date input. Values are strict UTC ISO strings with a documented split: pure dates serialize as fixed-zero UTC-midnight strings regardless of timezone; datetimes interpret the picked wall-clock as browser-local and serialize the real UTC instant. Ranges pick in two clicks with automatic ordering, validate `required` only when both ends hold values, and bound-check with plain string comparison. The popups follow the APG Date Picker Dialog pattern so keyboard and screen-reader users get the same experience.

## User Stories

1. As an app developer, I want a DateField component, so that I can collect a calendar date without building or restyling a picker myself.
2. As an app developer, I want a DateTimeField component, so that I can collect a date together with a time of day in one labeled control.
3. As an app developer, I want a DateRangeField component, so that users can pick a start and end date as one validated value.
4. As an app developer, I want a DateTimeRangeField component, so that users can book windows with independent start and end instants.
5. As an app developer, I want every emitted value to be a fixed-width UTC ISO string ending in `Z`, so that backends and databases receive unambiguous instants.
6. As an app developer, I want date-kind picks to serialize as `YYYY-MM-DDT00:00:00Z` with no timezone conversion, so that the stored calendar date equals the picked calendar date on every machine.
7. As an app developer, I want datetime-kind picks interpreted as browser-local wall-clock and serialized as the real UTC instant, so that what the user meant by "3:17 PM" survives crossing timezones.
8. As an app developer, I want `Initial` and `setValue` to accept ISO strings only — never `Date` objects or epoch numbers — so that the value contract stays simple and callers convert explicitly.
9. As an app developer, I want a no-`Z` input string to mean local wall-clock and convert to UTC on storage, so that seeding behaves identically to a fresh pick.
10. As an app developer, I want a bare `YYYY-MM-DD` seeded into a date kind stored verbatim as `T00:00:00Z`, so that the typed calendar date lands unchanged on any server.
11. As an app developer, I want invalid or non-ISO input to draw a dev-only warning naming the Field and be otherwise ignored, so that bad seeds fail loudly in development without crashing production.
12. As an app developer, I want `min`/`max` validator rules taking ISO strings on the date kinds, so that I can bound acceptable dates declaratively like numeric bounds.
13. As an app developer, I want textual rules (`minLength`/`maxLength`/`regex`/`email`) to stay non-fitting on date kinds with the usual dev warning, so that misconfiguration surfaces instead of silently doing nothing.
14. As an app developer, I want `required` on a range kind to reject half-picks (one end set, the other missing), so that incomplete bookings cannot pass submit-time validation.
15. As an app developer, I want `onValueChange` to stream range progress live with unset ends as `undefined`, so that I can react to picking as it happens without forcing completeness.
16. As an app developer, I want out-of-order range input (a completion earlier than the anchor) swapped automatically, including through `setValue`, so that `from <= to` always holds and I never normalize caller data myself.
17. As an app developer, I want `min` to test `from` and `max` to test `to` via plain string comparison, so that bounds read as "the whole range sits within bounds" with no date math.
18. As an app developer, I want the same imperative `FieldHandle` (`validate`/`getValue`/`setValue`) on the date kinds as everywhere else, so that submit-time handling is uniform across my whole form.
19. As an app developer, I want full presentation parity (`label`, `hint`, `disabled`, `className`) with the other kinds, so that date fields blend into my existing forms untouched.
20. As an app developer, I want `placeholder` to render only as the closed trigger face's ghost text while empty, so that it never leaks into the open popup.
21. As an app developer, I want the date display formats shared structurally with Table's column renderers rather than duplicated, so that cells and fields can never silently drift apart.
22. As an end user, I want to pick a date from a visual month grid instead of typing an ISO string, so that choosing a date is fast and error-free.
23. As an end user, I want my picks held as a visible draft until I press Apply, so that I can change my mind without the form reacting prematurely.
24. As an end user, I want Cancel and Escape to discard my draft, so that exploring the calendar never corrupts a carefully entered value.
25. As an end user, I want to type minutes freely (any value 0–59), so that I can enter exact times like 3:17 instead of snapping to preset steps.
26. As an end user picking a range, I want my first click anchored and second click completed — with an earlier completion swapping ends — so that I can pick in either direction naturally.
27. As an end user of the datetime range, I want independent time controls for the start and end, so that I can book 9:00–17:00-style windows and overnight spans alike.
28. As an end user, I want a freshly picked date to show midnight immediately in its time control, so that Apply always lands a complete instant with no surprise defaults.
29. As a keyboard user, I want the full APG grid keyboard map (arrows, PageUp/PageDown, Home/End, Enter/Space, Escape), so that I can operate the calendar entirely without a mouse.
30. As a keyboard user, I want focus to land on the selected day (or today) when the popup opens and return to the trigger when it closes, so that I never lose my place in the form.
31. As a screen-reader user, I want out-of-bounds days announced as disabled yet reachable, today named inside cell labels, and range picks announced via live regions, so that picking a range non-visually is actually possible.
32. As a maintainer, I want the four kinds implemented on the existing single engine with kindless config types stamped by thin wrappers, so that the architecture gains features without forking.
33. As a maintainer, I want a demo page exercising all four kinds and glossary coverage of the new vocabulary, so that the feature stays discoverable and speakable.

## Implementation Decisions

- **Single-engine architecture respected.** The four kinds join the existing one-engine Field module as new kind literals and value shapes; there is still no generic `Field` export. Public surface grows to nine thin wrapper components — `DateField`, `DateTimeField`, `DateRangeField`, `DateTimeRangeField` — following the existing `<KindName>Field` pattern, each stamping its kind literal onto a kindless config.
- **Config types** are non-generic, composing the existing common config: `FieldDateConfig`, `FieldDateTimeConfig`, `FieldDateRangeConfig`, `FieldDateTimeRangeConfig`. Singles type everything as plain `string`; ranges share one exported value type, chosen from the API-naming decision:
  ```ts
  type FieldDateRangeValue = { from?: string; to?: string }
  ```
  Optional props make half-picks representable and Initials construct naturally; whole-value absence remains `undefined` via the existing handle contract. Handles are `Ref<FieldHandle<string>>` on singles, `Ref<FieldHandle<FieldDateRangeValue>>` on ranges.
- **Value shapes and serialization split** (from the serialization contract):

  | Kind | Output | Rule |
  | --- | --- | --- |
  | `date`, `date-range` | `YYYY-MM-DDT00:00:00Z` per end | Fixed-zero UTC midnight; never timezone-converted on output |
  | `datetime`, `datetime-range` | `YYYY-MM-DDThh:mm:ssZ` per end | Picked wall-clock interpreted as browser-local; real UTC instant |

  Output is always fixed-width with seconds (`:00` when unpicked), milliseconds truncated — uniform width is what makes lexicographic `min`/`max` correct. DST edge cases resolve natively per ECMAScript (fall-back repeats take the first occurrence, spring-forward gaps roll forward): documented behavior, deliberately not special-cased.
- **Accepted inputs** (Initial / `setValue`): ISO strings only. One universal rule — a string without `Z` denotes local wall-clock and converts to the real UTC instant; a `Z` string is taken as-is; explicit offsets normalize to `Z`. Per-kind normalization: bare `YYYY-MM-DD` into a date kind appends `T00:00:00Z` verbatim (typed date wins over blanket conversion); bare dates into datetime kinds count as local midnight; a timed string entering a date kind takes the instant's UTC calendar date and re-emits fixed-zero (so a local string may land on an adjacent calendar day after conversion). Anything unparseable draws a dev-only console warning naming the Field and is ignored — matching the repo's existing warning-and-ignore patterns.
- **Empty semantics**: a range is Empty unless both ends hold values, joining the existing per-kind Empty rules — `required` rejects half-picks through the standard machinery, no new error slot. Unset ends read as `undefined` in streamed values; non-required Fields may legitimately hold half-ranges.
- **Validation**: date kinds gain `min`/`max` accepting ISO strings, alongside `required`. `min` tests `from`, `max` tests `to`, compared as plain strings (safe purely because output width is fixed). No cross-end validator rule — `from <= to` is an enforced invariant, so such a rule would guard an unreachable state. Textual rules remain non-fitting and reuse the existing rule-fit dev warnings.
- **Range picking** follows React Aria convention: first click anchors, second completes, an earlier completion swaps ends. `setValue` runs through the same pipeline as a user edit and normalizes identically, so stored ranges always satisfy `from <= to`.
- **Calendar popup UX** — Variant C from the prototype session wins for all four kinds: a **draft-with-commit** popup; every pick edits a pane-shown draft, **Apply** commits it to the Field, **Cancel**/**Escape** discards. Single month grid beside a summary/time pane. Minutes type freely (any 0–59), committed on blur/Enter with clamping. The prototype's CSS was broken and is explicitly discarded — the widget is rebuilt against the Field's own design tokens during implementation.
- **Time per range end**: DateTimeRangeField alone shows two labeled time controls (start/end) beside the grid, each applying to its own end. Picking a date seeds that end's draft time to 00:00 local shown immediately, so Apply always lands complete instants. Closed faces join per-end formatted strings with `" – "` (half-set ranges show the set end followed by a dash). Serialization stays per-end; same-day inversions normalize via the swap rule with instants swapped wholesale.
- **Accessibility** follows the APG Date Picker Dialog research: dialog containing a grid/gridcell month table with roving tabindex; full arrow/PageUp/Home/End/Esc keyboard map (Shift ±year, Enter/Space pick); focus on selected-day-else-today on open, back to trigger on close; `aria-selected` on the value date; polite live month heading; out-of-bounds days `aria-disabled` but reachable. Range two-step picking adopts React Aria/USWDS conventions (live-region announcements, composed cell names, selected-state band) since no W3C pattern exists. The popup is a non-modal disclosure — `aria-modal` omitted.
- **Shared date-display module**: extract, don't duplicate — the two en-US Intl display formatters and the bare-date pattern move out of Table into a small shared lib module exporting `DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, and `DATE_ONLY_PATTERN`; Table imports them and deletes private copies (behavior identical). This makes ticket 02's "control face matches Table" contract structural. Table's lenient parse/match machinery stays private — render/filter leniency differs fundamentally from Field's strict serialization.
- **Build order** (five ordered slices, converted from the effort's closed task tickets):
  1. Engine value model — kind literals, value shapes, half-pick Empty, swap normalization on picks and `setValue`, string-compare `min`/`max`, extended rule-fit warnings.
  2. Calendar widget extraction — reusable internal widget styled against Field tokens, carrying the a11y map and draft-commit interaction, shaped for both single and range consumption.
  3. DateField & DateTimeField — config types, wrappers, trigger faces, serialization split, tests.
  4. DateRangeField & DateTimeRangeField — two-step picking, swaps, half-picks, per-end times, serialization, tests.
  5. Demo page & glossary — demo usage for all four kinds; remaining CONTEXT.md entries (Calendar popup, draft/commit vocabulary).
- **Standing constraint**: no new runtime dependencies — if a library ever seems required, stop and ask the human before adding it. Native `<input type="date">` is rejected outright.

## Testing Decisions

- **Good tests observe external behavior only**: rendered output queried by accessible roles/names/labels, interactions driven by real user events (trigger press, grid-cell clicks, keyboard, Apply/Cancel), and outcomes asserted through the public observation points — the `onValueChange` spy stream and `FieldHandle` (`getValue`/`setValue`/`validate`). Internal state, helper functions, and styling classes are never asserted.
- **One seam**: the four public wrapper components, tested in the existing Field component suite. No new test seam is introduced anywhere in this feature.
- **Prior art**: the established harness pattern in the existing Field tests — one uncontrolled harness component per kind (config overrides + change spy + handle ref), vitest + Testing Library with jest-dom matchers. The date suites clone that shape per new kind.
- **Determinism**: datetime serialization interprets browser-local time, so date-kind suites run under a fixed `TZ` environment so expected UTC strings are identical on every machine and in CI.
- **Indirect coverage by design**: the extracted date-display helpers get no dedicated unit-test file. Their contract is guarded twice over — Table's existing suite must stay green through the migration, and Field control-face assertions pin the same formats from above. The calendar popup is exercised through its accessibility semantics (dialog/grid roles, names, announcements), not its visuals; the token-styled rebuild is verified visually during implementation, not by snapshotting styles.

## Out of Scope

- Anything beyond planning for the wayfinder effort itself — implementation proceeds outside it against this spec.
- Native date/time inputs in any form; multi-month calendar views; year-picker overlays beyond Shift±year navigation.
- Timezone selection or conversion UI; timezone-aware display; i18n beyond the fixed en-US display formats.
- Accepting `Date` objects, epoch numbers, partial strings (missing seconds are fine on *input*, but arbitrary non-ISO formats are not), or arrays as values.
- Second/millisecond picking UI — stored values carry seconds, display drops them, controls stop at minutes.
- A shared-single-time mode for datetime-range (rejected as a UI fiction fighting legal independent values) and any explicit cross-end validator rule.
- New validator rules beyond `min`/`max`/`required` on these kinds; changes to Table's parse/filter/render semantics; a generic `Field` export.
- Any new runtime dependency, however convenient.

## Further Notes

- Every decision above traces to a resolved ticket: a11y research (01), serialization contract (02, amended post-resolution — the no-Z-means-local rule and its bare-date exception were grilled and settled with the human), range semantics (03), popup UX prototype (04, captured off-mainline on branch `research/04-calendar-popup-ux`; structure wins, styling does not survive), API naming (05), shared helpers (06), per-end times (07).
- CONTEXT.md wording for nine components, the extended kind union, the kinds-vs-TableColumnType disambiguator, and Placeholder's date-kind mapping is already applied; deeper glossary terms land with slice 5.
- The serialization contract's uniform fixed width is load-bearing: lexicographic `min`/`max` correctness and stable closed-face ordering both depend on it. Treat any format drift as a breaking change.
