# 17 — Engine value model for the four date kinds

**What to build:** Teach the single-engine Field architecture everything it needs about dates before any picker UI exists: the `date`, `datetime`, `date-range`, and `datetime-range` kind literals and their value shapes (plain ISO strings for singles; the optional-both-ends range object), the half-pick Empty rule, out-of-order swap normalization, string-compare bounds, extended rule-fit warnings, and the strict input-normalization contract. Wrappers stay unshipped this slice — the pipeline is exercisable through `FieldHandle.setValue`/`getValue` tests, keeping the public-seam testing decision intact.

Serialization split per kind: date kinds emit fixed-zero UTC-midnight strings with no timezone conversion; datetime kinds interpret wall-clock as browser-local and emit the real UTC instant; output always fixed-width with seconds, milliseconds truncated. Inputs accept ISO strings only: no-`Z` means local and converts, bare dates enter date kinds verbatim appended with fixed-zero time, invalid input draws a dev-only warning naming the Field and is otherwise ignored (no-op `setValue`, seed-less `Initial`).

**Blocked by:** 16 (consumes the shared bare-date pattern for input normalization).

**Status:** ready-for-agent

- [ ] The engine accepts all four kinds with the correct value shapes; unset range ends read as `undefined` in observed values
- [ ] A range is Empty unless both ends hold values; `required` rejects half-picks through the existing machinery with no new error slot
- [ ] Every stored range satisfies `from <= to`, normalized identically whether produced by a pick-equivalent edit or `setValue`
- [ ] `min` tests `from` and `max` tests `to` via plain lexicographic string comparison
- [ ] Textual validator rules configured on a date kind draw the existing dev-only rule-fit warning naming the Field
- [ ] Output serialization follows the split table exactly, fixed-width with seconds
- [ ] Input normalization handles no-`Z` locals, bare dates per kind, offsets, and invalid strings (dev warning + ignore)
- [ ] Behavior verified through `setValue`/`getValue`/`validate` pipeline tests
