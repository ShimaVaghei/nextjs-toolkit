Type: grilling
Blocked by: 02
Status: resolved

## Question

Range-specific semantics: is a half-filled range (`from` set, `to` unset) Empty for `required`, or filled-but-invalid with its own message? How do `min`/`max` bind to a `{ from, to }` value — does `min` constrain `from`, `max` constrain `to`, plus an implied cross-end rule (`from <= to`)? And when a user picks ends out of order (picks a `to` earlier than `from`): swap, clamp, or reject?

## Answer

**Half-filled ranges & Empty**
- A range is **Empty unless both ends hold a value** — so `required` rejects half-picks with the existing required machinery, no new error slot.
- Unset ends surface as `undefined` in the observed value (`{ from: "2026-08-26T00:00:00Z", to: undefined }`): `onValueChange` streams picking progress live, and non-required Fields may legitimately hold a half-range.
- CONTEXT.md's Empty entry gains this per-kind rule when the kinds ship.

**min/max binding**
- `min` tests `from`; `max` tests `to`. Because out-of-order input never survives storage (below), `from <= to` is an invariant — making this exactly "the whole range sits within bounds".
- Comparison is plain lexicographic string comparison — correct only because the Serialization contract fixed output width; no Date math needed.
- No explicit cross-end validator rule: it would guard a state that cannot occur.

**Out-of-order picking**
- **Swap on earlier second click** — the React Aria convention the a11y research recorded: first click anchors, second click completes; if the completion is earlier than the anchor, earlier becomes `from`, later becomes `to`.
- `setValue` normalizes identically through the same pipeline as a user edit (repo precedent), so every stored range satisfies `from <= to`.
