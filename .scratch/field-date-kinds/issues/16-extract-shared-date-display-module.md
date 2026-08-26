# 16 — Extract shared date-display module (prefactor)

**What to build:** Make the cross-component display contract structural before any Field work lands. Table's two en-US display formatters and its bare-date pattern move out of Table into a small shared non-component module, exported under their contract names (`DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, `DATE_ONLY_PATTERN`). Table imports all three and deletes its private copies; behavior is identical and its existing suite passes untouched. Table's lenient parse/match machinery stays private — its render/filter semantics differ fundamentally from Field's strict serialization contract and must not be shared.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The two en-US display formatters and the bare-date pattern are exported from one shared module under the three contract names above
- [ ] Table consumes the shared module and owns no private copies of the moved pieces
- [ ] Table's parse/match machinery remains private to Table, unchanged
- [ ] Table's existing test suite passes without modification (behavior identical)
- [ ] No new runtime dependency introduced
