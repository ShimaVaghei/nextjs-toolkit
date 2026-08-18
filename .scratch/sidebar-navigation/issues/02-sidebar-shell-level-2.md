# 02 — Sidebar shell: Route type + Level 1 rendering + expand/collapse to Level 2

**What to build:** The `Sidebar` component renders Level 1 routes as a vertical list. Clicking a parent Route opens a second panel to the right showing its Level 2 children, animated with CSS grid transitions. The `Route` type is exported. Empty `routes` array renders nothing without errors.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Implement `Sidebar` component with `"use client"` directive
- [ ] Accept `routes: Route[]` prop
- [ ] Render Level 1 routes as a vertical list with spacing
- [ ] Parent nodes show a chevron indicator
- [ ] Clicking a parent opens a second panel (CSS grid `0fr → 1fr` animation)
- [ ] Clicking the same parent again closes the panel
- [ ] Panel slides in from the left
- [ ] Each panel is `w-64`
- [ ] Sidebar scrolls vertically on overflow
- [ ] Handle empty `routes` array gracefully
- [ ] Parent nodes have `aria-expanded` attribute
- [ ] Items are tab-focusable
