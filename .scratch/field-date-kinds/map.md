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

## Not yet specified

- Implementation slicing into task tickets (engine value-model extension for object-shaped values, calendar widget extraction, per-kind slices, test plan, demo page, glossary updates) — graduates once the decision tickets close.

## Out of scope
