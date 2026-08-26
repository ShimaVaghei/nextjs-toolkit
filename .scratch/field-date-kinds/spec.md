# Spec: Date & datetime Field kinds

Handoff spec from the `field-date-kinds` wayfinder effort. Every design decision is settled (route recorded in [`map.md`](map.md) Decisions so far, detail in each linked ticket); this document consolidates the contracts into one buildable brief. Implementation happens **outside wayfinder** — e.g. an `/implement` run against this file.

## What ships

Four new Field kinds on the single engine in `components/Field.tsx`: `date`, `datetime`, `date-range`, `datetime-range`, exposed as public wrapper components **DateField**, **DateTimeField**, **DateRangeField**, **DateTimeRangeField** (bringing the Field API to nine components, matching the wording already applied to `CONTEXT.md`). Values are ISO strings; controls render a custom calendar popup — deliberately not native `<input type="date">`.

## Settled contracts

### Value shapes

- Singles (`date`, `datetime`): plain `string` (ISO).
- Ranges (`date-range`, `datetime-range`): exported `FieldDateRangeValue = { from?: string; to?: string }`.
- Half-picks stream live: unset ends read as `undefined` in `onValueChange`; non-required Fields may legitimately hold a half-range. *(ticket 03)*

### Empty semantics

A range is **Empty unless both ends hold a value** — `required` rejects half-picks through the existing required machinery; no new error slot. This per-kind rule joins `CONTEXT.md`'s Empty entry. *(tickets 03)*

### Serialization

Outputs are always `…Z`, fixed-width with `:ss` *(ticket 02)*:

| Kind | Output | Rule |
| --- | --- | --- |
| `date` | `YYYY-MM-DDT00:00:00Z` | Fixed-zero UTC-midnight string; no timezone conversion |
| `datetime` | `YYYY-MM-DDThh:mm:ssZ` | Picked wall-clock interpreted as browser-local; real UTC instant |
| ranges | Per end, matching the single of the same family | Always per-end, never a joined fiction *(ticket 07)* |

Inputs accept ISO strings only: no-`Z` input means local time and converts; bare dates entering a date kind append `T00:00:00Z` verbatim; invalid input draws a dev-only warning and is ignored. Control face formats via the shared en-US Intl patterns (below).

### Validation

- Dates get `min`/`max` (ISO-string values) in addition to `required`; textual rules (`minLength`/`maxLength`/`regex`/`email`) stay non-fitting, with the existing rule-fit dev warnings naming the Field. *(ticket 02)*
- `min` tests `from`; `max` tests `to` — plain lexicographic string compare, correct only because output width is fixed. Because out-of-order input never survives storage, `from <= to` always holds, so this is exactly "the whole range sits within bounds"; no explicit cross-end validator rule (it would guard an unreachable state). *(ticket 03)*

### Range picking

Swap on earlier second click (React Aria convention): first click anchors, second completes; a completion earlier than the anchor swaps ends. `setValue` normalizes identically through the same pipeline as a user edit. *(ticket 03)*

### Calendar popup UX

Variant C wins for all four kinds *(ticket 04)*: **draft-with-commit** — picks edit a pane-shown draft; Apply lands it, Cancel/Escape discards — with a single month beside the summary/time pane. Minutes type freely (any 0–59). **The prototype styling was broken and must be rebuilt against Field tokens during implementation.**

Time per range end *(ticket 07)*: DateTimeRangeField only — two labeled time controls in the pane; a picked date seeds its end's draft to 00:00 local shown immediately; the closed face joins the per-end `DATETIME_DISPLAY_FORMAT` strings with `" – "`.

### Accessibility

Follow APG Date Picker Dialog *(ticket 01)*: dialog+grid with roving tabindex; full arrow/PageUp/Home/End/Esc keyboard map; focus lands on the selected day (or today) on open and returns to the trigger on close; out-of-bounds days are aria-disabled. Range two-step picking follows React Aria/USWDS conventions — live-region announcements, composed cell names, selected-state band — since no W3C pattern exists.

### API surface

Non-generic, kindless config types `FieldDateConfig`, `FieldDateTimeConfig`, `FieldDateRangeConfig`, `FieldDateTimeRangeConfig` following the existing pattern; wrapper components stamp the kind literal. Full presentation parity with the other kinds; `placeholder` appears only on the closed trigger face. *(ticket 05)*

### Shared date helpers

Extract, don't duplicate *(ticket 06)*: the two en-US display formatters and the bare-date pattern move to `lib/date-formats.ts` (`DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, `DATE_ONLY_PATTERN`) so the "matching Table" contract is structural. Table's lenient parse/match machinery stays private — its semantics differ from Field's strict serialization.

## Work breakdown

Ordered build plan (converted from the effort's closed task tickets):

1. **Engine value model** — add the four kind literals and value shapes to `components/Field.tsx`; half-pick Empty; out-of-order normalization on picks and `setValue`; `min`/`max` via string compare testing `from`/`to`; rule-fit warnings extended. Wrappers unshipped; pipeline exercisable through `FieldHandle.setValue`/`getValue` for tests.
2. **Calendar widget extraction** — reusable internal widget styled against Field tokens (rebuild, not the prototype's CSS), carrying the APG keyboard/a11y map and draft-with-commit interaction, shaped so both single and range kinds consume it (summary/time pane beside one month).
3. **DateField & DateTimeField** — config types, wrappers, trigger faces (en-US Intl summary or placeholder ghost while Empty), serialization split, tests.
4. **DateRangeField & DateTimeRangeField** — two-step picking over the draft-commit popup, swaps, half-picks, per-end times for the datetime variant, config types, serialization, tests.
5. **Demo page & glossary** — demo-page usage exercising all four kinds; remaining `CONTEXT.md` entries (Calendar popup, Draft/commit vocabulary, any other unnamed territory from ticket 04).

Tests follow the existing vitest + Testing Library harness pattern in `components/Field.test.tsx`.

## Standing constraints

- **No new runtime dependencies** — if a library ever seems required, stop and ask before adding it.
- Custom calendar popup only; native date inputs are rejected.
