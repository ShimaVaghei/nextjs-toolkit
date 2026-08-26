Type: task
Status: open
Blocked by: 06, 07, 11, 12, 13

## Question

How do `DateRangeField` and `DateTimeRangeField` ship end-to-end once the singles exist? Two-step range picking over the draft-with-commit popup, out-of-order picks swapping, half-picks held as `{ from?, to? }` reading Empty until both ends exist, `min`/`max` testing `from`/`to`, config types `FieldDateRangeConfig` / `FieldDateTimeRangeConfig`, serialization matching the singles' split, plus tests.
