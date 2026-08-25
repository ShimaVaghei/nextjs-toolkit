# 05 — Unbounded Option values, Matching, Fallback

**With the native select gone**, Option values can be anything. A form builder hands a select numeric ids or domain objects directly; users always see labels. Reference identity decides which Option matches the current value unless the builder supplies a comparator, and a value matching nothing still renders honestly instead of leaking `[object Object]`.

**Blocked by:** 01 — Prefactor: prefix all exported Field types; 04 — Select rebuilt on the shared Options popup.

**Status:** ready-for-agent

- [ ] `FieldOption<T>` accepts an unbounded value; select and multi-select configs narrow their values to `T` / `T[]` through the generic config
- [ ] Labels are the only rendered surface for options — rows, chips, and the closed face never stringify a value for display
- [ ] `Object.is` identity is the default Matching rule driving closed-face resolution, popup checkbox states, chip membership, and staleness detection
- [ ] An optional `matchValue(a, b)` override on the config replaces identity everywhere consistently
- [ ] An unmatched primitive value renders its string form; an unmatched non-primitive renders a generic "(unknown option)" marker — both inert and accompanied by the dev-only warning, in both kinds
- [ ] Chip removal, row toggling, and selection all work under object-valued options with the matcher configured
- [ ] Demo page includes an object-valued select; suite adds object/matcher/Fallback cases
