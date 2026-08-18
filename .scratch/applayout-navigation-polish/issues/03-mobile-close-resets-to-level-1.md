# 03 — Mobile: closing the overlay resets to Level 1

**What to build:** Every way of closing the Mobile overlay returns the sidebar to the collapsed state, so reopening always starts at Level 1 rather than restoring the previous drilled-down Level.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Closing the Mobile overlay via the close button collapses the sidebar; reopening the overlay shows only Level 1.
- [ ] Closing the Mobile overlay via the Escape key also collapses it; reopening shows only Level 1.
- [ ] Navigating to a Leaf still collapses the sidebar and closes the overlay (existing behavior preserved).
- [ ] Reopening the overlay after closing it while drilled down to Level 2 or Level 3 always starts at Level 1.