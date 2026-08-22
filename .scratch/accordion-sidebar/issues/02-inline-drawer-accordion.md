# 02 — Inline Drawer accordion replaces multi-panel flyouts

**What to build:** Replace the horizontal multi-panel drawer with a single-panel accordion: clicking a Collapsible route animates its children open directly beneath it, identically on desktop and inside the Mobile overlay (they share one renderer). Any number of Drawers can be open at once, each identified by its Full path, and a click toggles only its own Drawer. Level 3 and deeper nest recursively within the now fixed-width sidebar, which never shifts the page content. The drill-down chrome — Back icon, per-level hidden/shown choreography, and all horizontal panel machinery — is deleted. To keep this slice a pure render-model swap, the three legacy collapse triggers (leaf navigation, content-area clicks, overlay close) still clear all Drawers; ticket 03 removes them.

**Blocked by:** 01 — Sectioned route data model.

**Status:** ready-for-agent

- [ ] Clicking a Collapsible route animates its children open directly beneath it, with a smooth vertical reveal, on desktop and inside the Mobile overlay
- [ ] Any number of Drawers can be open at once; clicking one Collapsible route never closes another Drawer
- [ ] Clicking an open Collapsible route closes only its own Drawer
- [ ] Level 3 (and deeper) routes render nested under their own parents inside the fixed width
- [ ] The sidebar keeps a constant width whether zero or several Drawers are open; page content never shifts
- [ ] A parent's chevron rotates when its Drawer is open
- [ ] Drill-down chrome (Back icon, level-hiding) is gone; the overlay header shows title and close button only
- [ ] Legacy triggers kept temporarily: leaf navigation, content clicks, and overlay close collapse all Drawers
- [ ] Accessibility preserved: tree/treeitem/group roles, aria-expanded, aria-level, aria-setsize, aria-posinset, tab focus
