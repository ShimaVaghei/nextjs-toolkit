Type: task
Status: open
Blocked by: 06, 11, 12

## Question

How do `DateField` and `DateTimeField` ship end-to-end on the extended engine and calendar widget? Config types `FieldDateConfig` / `FieldDateTimeConfig`, wrapper components stamping their kind literals, closed trigger faces showing en-US Intl summaries or placeholder ghost text while Empty, serialization per contract — `date` emits fixed-zero UTC-midnight strings, `datetime` interprets picked wall-clock as browser-local and emits the real UTC instant — plus tests.
