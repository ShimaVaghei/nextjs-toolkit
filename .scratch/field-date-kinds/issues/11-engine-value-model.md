Type: task
Status: closed

> Closed out of scope 2026-08-26: the map's destination was redrawn to plan-only — implementation left wayfinder. This slice's content is preserved in [`../spec.md`](../spec.md) (Work breakdown, step 1).

## Question

How does the Field engine's value model extend for the four date kinds with no popup UI yet? Add the `date` / `datetime` / `date-range` / `datetime-range` kind literals, the fixed value shapes (`string` singles; exported `FieldDateRangeValue = { from?: string; to?: string }` for ranges), half-pick Empty semantics (a range is Empty unless both ends hold), out-of-order normalization (`from <= to`) on picks and `setValue`, validator `min`/`max` via plain string compare testing `from`/`to`, and rule-fits dev warnings (textual rules never fit these kinds). Wrappers stay unshipped; the pipeline must be exercisable through the Handle for tests.
