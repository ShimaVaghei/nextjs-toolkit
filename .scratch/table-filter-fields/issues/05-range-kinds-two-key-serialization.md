# 05 — Range filter kinds and two-key serialization

**What to build:** `filterable: { kind: "date-range" | "datetime-range" | "number-range" }` renders the corresponding range Field in the popover, and the filter emits **two separate scalar entries** in the filters record — never a tuple. Key resolution: a `{ from, to }` key pair is used verbatim with no suffixing; a string key or no key defaults to `"<key or columnKey>.from"` / `".to"`. The documented footgun (two unnamed range filters colliding) is covered by tests asserting the default key shapes, not by detection code.

**Blocked by:** 02.

**Status:** done

- [x] Each range kind renders its range Field (Calendar or number-range) inside the popover
- [x] A `{ from, to }` key pair sends exactly `filters[from]` and `filters[to]` as scalars, verbatim
- [x] A string key sends `"<key>.from"`/`"<key>.to"`; an omitted key sends `"<columnKey>.from"`/`"<columnKey>.to"`
- [x] Partial (open-ended) range input still produces the two entries with the unfilled bound cleared
- [x] Clearing the range omits both entries from the next request
