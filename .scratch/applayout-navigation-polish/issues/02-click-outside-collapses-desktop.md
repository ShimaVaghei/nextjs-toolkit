# 02 — Desktop: clicking outside the sidebar collapses it

**What to build:** On desktop (md+), clicking the content area — anywhere outside the sidebar column — returns the sidebar to the collapsed state (only Level 1 visible). The Mobile overlay is unaffected.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] On md+, clicking in the content area (outside the sidebar column) while a panel is expanded collapses the sidebar to Level 1.
- [x] Clicking inside the sidebar (on any panel or item) never collapses it.
- [x] Clicking outside when the sidebar is already collapsed is a no-op.
- [x] The Mobile overlay behavior is unchanged; collapsing only applies to the desktop sidebar.

## Comments

Implemented in `components/AppLayout.tsx`: the content column (`flex-1 p-4`) now carries an `onClick` handler that collapses `expandedPanels` to `COLLAPSED_PANELS` (`{ level1: null, level2: null, level3Visible: false }`, reused as the initial state and by `handleNavigate`) when a panel is open. The handler guards three ways so it only acts on desktop, outside-clicks: it bails when the mobile overlay is open (`isOverlayOpen`), when the viewport is below `md` (`isDesktopViewport()` via `window.matchMedia(MD_MEDIA_QUERY)`, `"(min-width: 768px)"`), and when the sidebar is already collapsed (`level1 === null`, a no-op). Clicks inside the sidebar never reach the handler because the sidebar column is a sibling of the content column. Tests added in `components/AppLayout.test.tsx` (7 cases: desktop collapse from Level 2 and Level 3, sidebar clicks never collapse, no-op when collapsed, double-click, mobile viewport no-op, and overlay unaffected). jsdom lacks `matchMedia`, so tests mock it via `mockMatchMedia`.