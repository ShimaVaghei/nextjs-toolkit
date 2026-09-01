# 03 - Range-kind validation: NaN-as-empty and a rule fitting

**What to build:** The pure validation module treats number-range values like the other range kinds for emptiness. A number-range value is Empty unless both ends hold a present, non-NaN bound - so a missing bound  or  NaN-bound(from garbage typing)counts as Empty. Therefore `required` on the kind demands both ends,catching a half-filled  or  NaN-containing range with the built-in copy unless the caller supplies their own message,. The rule-fitting diagnostics extend:the generic `min`/`max` rules are accepted on `number-range`, so the dev-only *unfitted-rules* warning must not fire for them,. Per the approved reading, `min`/`max`/`step` act as presentation attributes passed through by the render layer(ticket 04,, with no separate range-level `from`/`to` error message;richer per-bound rules remain deferred`.

**Blocked by:** 01 - Register `number-range` kind and render a `NumberRangeField` that commits a Range

.,

**Status:** ready-for-agent

- [ ] A partial number-range(`{ from }` only)counts as Empty;a NaN-containing bound counts as Empty
- [ ] `required` on a number-range Field rejects a half-filled or NaN-containing range with the built-in copy,and honors a `{ value, message }` pair
- [ ] `min`/`max` are accepted as fitting the kind(no dev *unfitted-rules* warning fires for them`.
- [ ] Tests mirror the existing range-kind validation cases" counts coerced NaN as Empty" and "tests from/to on range kinds";external behavior only.