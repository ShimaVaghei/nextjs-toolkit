# 01 - Register number-range kind and render a NumberRangeField that commits a Range

**What to build:** A new number-range Field kind that a caller instantiates through a new NumberRangeField wrapper
component, shaped like every existing kind: a plain-data config type, a wrapper that stamps the kind, and a
component that renders. The kind joins the Field vocabulary type and the value mapping resolves to a range value
shaped like the date-range value but numeric `{ from: number; to: number }`. The Field renders two adjacent number
inputs (From and To)and behaves as one labelled control; the caller never writes the kind literal nor passes a live
from/to pair. Editing either input commits a range with both ends' others bound preserved; a ref-typed FieldHandle
returns/installs that range shape.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] A NumberRangeField wrapper and a FieldNumberRangeConfig type exist; no caller writes the kind literal.
- [ ] The number-range kind joins the Field vocabulary type,and the value mapping resolves to the range value type.
- [ ] The Field renders two adjacent number inputs with accessible From/To labels; editing either commits a from?/to?
  value preserving the other end.
- [ ] A ref-typed FieldHandle exposes getValue/setValue for the range value.
- [ ] Tests assert external behavior only: render, type into From/To, committed value shape, andle get/set.
