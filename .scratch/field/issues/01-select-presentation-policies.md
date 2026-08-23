# Select presentation policies

Type: grilling
Status: open

## Question

For the `select` and `multi-select` kinds, unresolved rendering and edge-case policies:

1. How does `placeholder` manifest on a native `<select>` (disabled ghost first option vs. shown only when value is empty)?
2. What renders when the current `value` is not among the resolved Options (stale/unknown value) — raw value display, silent fallback to empty, or error?
3. Is a currently-selected-but-`disabled` Option legal, and how does it render?
4. Exact pending ("Loading…") and rejected ("Couldn't load options") presentation for each of the two kinds.
