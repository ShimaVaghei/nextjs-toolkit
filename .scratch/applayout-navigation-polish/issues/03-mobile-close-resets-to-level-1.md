# 03 — Mobile: closing the overlay resets to Level 1

**What to build:** Every way of closing the Mobile overlay returns the sidebar to the collapsed state, so reopening always starts at Level 1 rather than restoring the previous drilled-down Level.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Closing the Mobile overlay via the close button collapses the sidebar; reopening the overlay shows only Level 1.
- [x] Closing the Mobile overlay via the Escape key also collapses it; reopening shows only Level 1.
- [x] Navigating to a Leaf still collapses the sidebar and closes the overlay (existing behavior preserved).
- [x] Reopening the overlay after closing it while drilled down to Level 2 or Level 3 always starts at Level 1.

## Comments

Implemented in `components/AppLayout.tsx`: the Escape key handler and the close button now both call a shared `handleCloseOverlay` (a `useCallback` that resets `expandedPanels` to `COLLAPSED_PANELS` and closes the overlay), replacing the previous behavior where only the overlay flag was cleared. Leaf navigation still collapses via the same handler, so every close path — close button, Escape, and Leaf click — returns the sidebar to Level 1. Tests added in `components/AppLayout.test.tsx` (3 cases: close-button collapse, Escape collapse, and reopening from a drilled-in Level 3; Leaf-navigation collapse was already covered).