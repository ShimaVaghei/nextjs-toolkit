# 06 — Contract: retire the hand-rolled filter input and modernize the demos

**What to build:** Every filter kind now renders a Field, so the old bare-input filter path is deleted — the filter popover is Field-only, with no fallback branch left. The demo tables showcase the new object form of `filterable` (including a select with async options and a range filter) alongside the legacy shorthands. The glossary in CONTEXT.md already records the design; this ticket leaves the code matching it, with the full suite green.

**Blocked by:** 02, 03, 04, 05.

**Status:** ready-for-agent

- [ ] The bare-input filter implementation is removed; no filterable column renders anything but a Field
- [ ] Demo tables demonstrate the object form: select (with async options), multi-select, date-range with explicit `{ from, to }` keys, and the shorthands
- [ ] Full test suite (table + field) green; typecheck clean
- [ ] README/demo copy, if it documents `filterable`, describes the new union and the range-key collision footgun
