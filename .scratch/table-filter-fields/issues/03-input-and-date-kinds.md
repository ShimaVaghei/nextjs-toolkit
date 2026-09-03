# 03 — Input and date/datetime filter kinds

**What to build:** `filterable: { kind: "input", inputType? }`, `kind: "date"`, and `kind: "datetime"` render their real Fields (InputField, DateField, DateTimeField) inside the filter popover, replacing the bare-input fallback for those kinds. Number columns keep numeric filter semantics; date/datetime filters pick through the Calendar popup and send the committed value under the resolved key.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] An input filter renders an InputField and preserves today's text/number emission behavior through the request payload
- [ ] `inputType` accepts only text or number; a password filter is unrepresentable
- [ ] Date and datetime filters render the Calendar kinds in the popover and send their committed value as a scalar under the resolved key
- [ ] Clearing any of these filters omits it from the next request; the dot/chip lifecycle is unchanged
- [ ] Kind inference from `column.type` now routes text/number columns to the input Field and date/datetime columns to their Calendar kind
