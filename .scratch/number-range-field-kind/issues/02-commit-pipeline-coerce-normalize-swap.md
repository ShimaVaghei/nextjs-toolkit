# 02 - Commit pipeline: coerce, normalize, and swap number-range ends

**What to build:** Each bound's edit runs through the same numeric coercion matrix as a number input Field: an empty string becomes the empty sentinel, non-numeric garbage becomes NaN (countsasEmpty at validation time).). Missing ends normalize to `undefined` with both keys always presentin the committed value, mirroring the date-range normalization; a partial range (`{ from }` only)stays a legitimate committed value rather than vanishing. When both ends are present and out-of-order (`from > to`),the ends swap so `from <= to` always holds;coercion, never an ordering error. When no end is set at all,the Field holds `undefined`. The imperative `setValue()` installs also run through the exact same pipeline as a user edit, so installed and user-driven changes are indistinguishable. This reflects the approved Range swap invariant(swap, never error)chosen for cross-kind consistency withthe date ranges.

.,

**Blocked by:**: 01 - Register `number-range` kind and render a `NumberRangeField` that commits a Range

.,

**Status:** ready-for-agent

- [ ] Typing garbage in either end commits NaN for that end (counts as Empty at validation).
- [ ] Leaving an end blank leaves that end `undefined` in the committed range;a raw string never leaks into the value.
-
 [ ] Out-of-order ends swap autonomously on commit so `from <= to` always holds;a complete in-order range is unchanged
- [ ] With no end set,the Field holds `undefined`;a partial range (`{ from }` only)is preserved as the committed value on non-required Fields
- [ ] `setValue()` installs run through the identical normalize/swap/coerce pipeline as a user edit(indistinguishable via `getValue()`and the observer).
- [ ] Tests assert external behavior: swap, coercion, partial-range commits, cleared-to-undefined,andle parity.