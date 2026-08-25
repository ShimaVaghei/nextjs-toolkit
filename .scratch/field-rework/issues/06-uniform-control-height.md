# 06 — Uniform control height

**What to build:** Every control except textarea renders at one shared height, so forms align visually regardless of Field kind. The input, the select's closed-face trigger, and the multi-select chip strip share the existing tall control height, and the checkbox gains its own control row of that height with box and label vertically centered. Textarea keeps its multi-row, resizable exemption.

**Blocked by:** 04 — Select rebuilt on the shared Options popup.

**Status:** ready-for-agent

- [ ] Input, select trigger, and chip strip all render at the uniform control height (`h-11`)
- [ ] Checkbox Fields render inside an equally tall control row with the box and label vertically centered
- [ ] Textarea remains exempt: multi-row initial size, vertically resizable
- [ ] Height is enforced as the shared class contract in tests (class presence only — no pixel probing)
- [ ] The demo page shows every kind side by side with aligned controls
