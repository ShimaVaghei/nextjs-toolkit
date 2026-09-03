# 04 — Multi-select filter kind

**What to build:** `filterable: { kind: "multi-select", options? }` renders a real MultiSelectField in the filter popover — chips inside the strip, Options from a static array or async loader — and the filters record receives an array of scalars under the resolved key. Removing all chips (or the summary chip) omits the filter from the request.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] A multi-select filter renders a MultiSelectField with chip selection in the popover
- [ ] The request payload carries a scalar array under the resolved key (the existing filters-record array shape — no new wire type)
- [ ] Clearing the selection via the popup's Clear, or removing the summary chip, omits the filter
- [ ] Async options inherit Pending/Rejected/Retry behavior from Field
