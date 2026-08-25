# 04 — Select rebuilt on the shared Options popup

**What to build:** Select stops being a native `<select>` and becomes a disclosure trigger plus the same searchable popup multi-select already uses. An end user clicks anywhere on a row to pick an Option and the popup closes; in multi-select, whole-row clicks toggle membership while the popup stays open. Ghost placeholder, disabled-option demotion, and the async load lifecycle carry over intact — this is the structural move that makes stringification-free option values possible in the next ticket.

**Blocked by:** 02 — Field owns its value (seed-once + ref control).

**Status:** ready-for-human

- [x] Select renders a closed face showing either the placeholder ghost (while empty) or the selected Option's label, opening the shared popup on trigger click
- [x] The popup shares one implementation across both choice kinds: search box filters rows, opening moves focus to search, Escape/outside-click/focus-loss closes and resets the query
- [x] Clicking anywhere in a select row picks that Option and closes the popup, returning focus to the trigger
- [x] Clicking anywhere in a multi-select row toggles membership without closing; disabled Options render inert everywhere
- [x] keepDisabledSelection demotion behavior preserved for held disabled selections
- [x] Pending blocks choosing and keeps held selections visible; Rejected offers Retry that re-fires the loader
- [x] No native select element remains in the component; the select interaction suites (staleness fallback display, focus management, announcements) migrated and green
