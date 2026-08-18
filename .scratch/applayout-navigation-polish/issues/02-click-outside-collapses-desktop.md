# 02 — Desktop: clicking outside the sidebar collapses it

**What to build:** On desktop (md+), clicking the content area — anywhere outside the sidebar column — returns the sidebar to the collapsed state (only Level 1 visible). The Mobile overlay is unaffected.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] On md+, clicking in the content area (outside the sidebar column) while a panel is expanded collapses the sidebar to Level 1.
- [ ] Clicking inside the sidebar (on any panel or item) never collapses it.
- [ ] Clicking outside when the sidebar is already collapsed is a no-op.
- [ ] The Mobile overlay behavior is unchanged; collapsing only applies to the desktop sidebar.