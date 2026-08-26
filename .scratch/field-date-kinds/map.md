# Wayfinder map: Date & datetime Field kinds

Labels: wayfinder:map

## Destination

All four Field kinds shipped end-to-end in `components/Field.tsx` — DateField, DateTimeField, DateRangeField, DateTimeRangeField — with config types and wrappers following the existing kindless-config pattern, a custom calendar popup, ISO-string values per the settled contracts below, validation and Empty semantics defined, tests, demo-page usage, and `CONTEXT.md` updated.

## Notes

- Domain: single-engine Field architecture (`components/Field.tsx`); every session consults `CONTEXT.md` "Form terms" first. Configs are kindless types stamped by thin wrapper components.
- Settled at charting:
  - Range value shape: `{ from: string, to: string }` (ISO strings).
  - Serialization split: `date`/`date-range` emit fixed-zero UTC-midnight strings (`YYYY-MM-DDT00:00:00Z`, no timezone conversion); `datetime`/`datetime-range` interpret the picked wall-clock as browser-local time and emit the real UTC instant.
  - Controls render as a custom calendar popup in the spirit of the select Options popup — deliberately not native `<input type="date">`.
  - Validator: dates get `min`/`max` (ISO strings) in addition to `required`; textual rules stay non-fitting.
- Standing preference: **no new runtime dependencies** — if a library ever seems required, stop and ask the human before adding it.
- Execution is carried into this map (override of plan-only): once decisions clear, task tickets slice the implementation — the destination is a shipped change, not a spec.
- Skills per ticket type: `/grilling` + `/domain-modeling` for decisions; `/prototype` for popup UX; `/research` for external knowledge.

## Decisions so far

- [Calendar popup a11y research](issues/01-calendar-popup-a11y-research.md) — Follow APG Date Picker Dialog: dialog+grid with roving tabindex, full arrow/PageUp/Home/End/Esc keyboard map, focus on selected day/today on open and back to trigger on close, aria-disabled for out-of-bounds days; range two-step picking follows React Aria/USWDS conventions (live-region announcements, composed cell names, selected-state band) since no W3C pattern exists.
- [Serialization contract](issues/02-serialization-contract.md) — Outputs always `…Z`, fixed-width with `:ss`: date kinds `YYYY-MM-DDT00:00:00Z` fixed-zero; datetime kinds `YYYY-MM-DDThh:mm:ssZ` real UTC instants (native ECMAScript DST resolution). Inputs: ISO strings only — no-Z means local and converts; bare dates into date kinds append `T00:00:00Z` verbatim; invalid input warns dev-only and is ignored. Control face: en-US Intl matching Table.
- [Range semantics](issues/03-range-semantics.md) — A range is Empty unless both ends hold values (`required` rejects half-picks; unset end reads as `undefined` in streamed values). `min` tests `from`, `max` tests `to` via plain string compare; out-of-order picks swap (React Aria convention) and `setValue` normalizes identically, so `from <= to` always holds.
- [Calendar popup UX](issues/04-calendar-popup-ux.md) — Variant C wins for all four kinds: draft-with-commit popup (picks edit a pane-shown draft; Apply lands, Cancel/Escape discards), single month beside the summary/time pane; minutes type freely (any 0–59); prototype styling was broken and must be rebuilt against Field tokens during implementation. Prototype captured on `research/04-calendar-popup-ux`.
- [API naming and config surface](issues/05-api-naming-and-config-surface.md) — Components `DateField`/`DateTimeField`/`DateRangeField`/`DateTimeRangeField`; non-generic configs `FieldDateConfig` etc.; singles type as `string`, ranges share exported `FieldDateRangeValue = { from?: string; to?: string }`; full presentation parity with placeholder only on the closed trigger face; CONTEXT.md wording applied (nine components, extended kind union, kinds-vs-TableColumnType disambiguator).
- [Shared date helpers](issues/06-shared-date-helpers.md) — Extract, don't duplicate: the two en-US display formatters and the bare-date pattern move to `lib/date-formats.ts` (`DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, `DATE_ONLY_PATTERN`) so ticket 02's "matching Table" contract is structural; Table's lenient parse/match machinery stays private — its semantics differ from Field's strict serialization.
- [Time per range end](issues/07-time-per-range-end.md) — Independent times per end: two labeled time controls in the pane (DateTimeRangeField only), a picked date seeds its end's draft to 00:00 local shown immediately, closed face joins per-end `DATETIME_DISPLAY_FORMAT` strings with " – ", serialization unchanged (always per-end). Shared-time rejected as a UI-only fiction that would fight legal independent values.

## Not yet specified

_None — the way is charted. Remaining work lives in the task tickets._

## Out of scope
