Type: task
Status: closed
Blocked by: 06, 07, 11, 12, 13

> Closed out of scope 2026-08-26: the map's destination was redrawn to plan-only — implementation left wayfinder. This slice's content is preserved in [`../spec.md`](../spec.md) (Work breakdown, step 4).

## Question

How do `DateRangeField` and `DateTimeRangeField` ship end-to-end once the singles exist? Two-step range picking over the draft-with-commit popup, out-of-order picks swapping, half-picks held as `{ from?, to? }` reading Empty until both ends exist, `min`/`max` testing `from`/`to`, config types `FieldDateRangeConfig` / `FieldDateTimeRangeConfig`, serialization matching the singles' split, plus tests.
