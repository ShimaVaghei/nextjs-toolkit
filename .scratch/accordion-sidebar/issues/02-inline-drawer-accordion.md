# 02 — Inline Drawer accordion replaces multi-panel flyouts

**What to build:** Replace the horizontal multi-panel drawer with a single-panel accordion: clicking a Collapsible route animates its children open directly beneath it, identically on desktop and inside the Mobile overlay (they share one renderer). Any number of Drawers can be open at once, each identified by its Full path, and a click toggles only its own Drawer. Level 3 and deeper nest recursively within the now fixed-width sidebar, which never shifts the page content. The drill-down chrome — Back icon, per-level hidden/shown choreography, and all horizontal panel machinery — is deleted. To keep this slice a pure render-model swap, the three legacy collapse triggers (leaf navigation, content-area clicks, overlay close) still clear all Drawers; ticket 03 removes them.

**Blocked by:** 01 — Sectioned route data model.

**Status:** ready-for-agent

- [x] Clicking a Collapsible route animates its children open directly beneath it, with a smooth vertical reveal, on desktop and inside the Mobile overlay
- [x] Any number of Drawers can be open at once; clicking one Collapsible route never closes another Drawer
- [x] Clicking an open Collapsible route closes only its own Drawer
- [x] Level 3 (and deeper) routes render nested under their own parents inside the fixed width
- [x] The sidebar keeps a constant width whether zero or several Drawers are open; page content never shifts
- [x] A parent's chevron rotates when its Drawer is open
- [x] Drill-down chrome (Back icon, level-hiding) is gone; the overlay header shows title and close button only
- [x] Legacy triggers kept temporarily: leaf navigation, content clicks, and overlay close collapse all Drawers
- [x] Accessibility preserved: tree/treeitem/group roles, aria-expanded, aria-level, aria-setsize, aria-posinset, tab focus

## Comments

Implemented on branch `sidebar`. The horizontal panel machinery (`RoutePanel`, `NavigationPanels`, `ExpandedPanels`, column transitions) and all drill-down chrome (`handleBack`, Back icon, per-level hidden/shown classes) are deleted. A single recursive `RouteTree` now renders desktop sidebar and Mobile overlay identically: each Collapsible route renders a button plus a Drawer wrapper using the repo's grid transition (`grid-rows-[0fr] ↔ [1fr]`, 300ms ease-in-out, vertical-only), with children mounted only while open and indented via a nested `ml-4` group list. Drawer state is a `Set<string>` of Full paths; toggling touches only its own entry — no cascading closes anywhere. Sidebar is fixed `w-64`; `md:max-w-3xl` growth removed. Legacy triggers retained per ticket scope: leaf navigation, content-area clicks (desktop only), and overlay close all clear the set; ticket 03 removes them. Component suite rewritten to the accordion model (47 tests, red-first at the component seam); pure-function tests untouched and green. Full suite: 149 passed; typecheck clean; eslint clean. A two-axis code review pass afterwards renamed the drawer-key identifiers from `fullPath` to `nodePath` (CONTEXT.md's Avoid list bans `fullPath`), extracted `RouteTreeSharedProps` and a `treeItemAria` helper to remove prop-type duplication between `SidebarNav` and `RouteTree`, and dropped a stray `shrink-0`; the reviewer-noted instant unmount on Drawer close matches HEAD precedent and AC wording ("animates open"), so it stands for this slice.
