# 03 — User-managed Drawer lifecycle and mount-time auto-expand

**What to build:** Drawers become purely user-managed: navigating to a Leaf node, clicking page content, and closing the Mobile overlay no longer collapse anything — only clicking a Collapsible route toggles its own Drawer. Overlay close/reopen preserves which Drawers are open. On mount, the Drawers along the active route's ancestry open once so a direct landing on a deep Full path shows location in context; afterwards nothing forces them open until a full reload. This ticket deliberately inverts the legacy assertions that ticket 02 kept alive (post-leaf collapse, outside-click collapse, overlay reset-on-close).

**Blocked by:** 02 — Inline Drawer accordion replaces multi-panel flyouts.

**Status:** ready-for-agent

- [x] Navigating to a Leaf node leaves every Drawer exactly as it was
- [x] Clicking the page content never changes which Drawers are open, on any viewport
- [x] Closing and reopening the Mobile overlay preserves the open Drawers
- [x] Landing directly on a deep Full path opens the Drawers along its ancestry once on mount, with the active Leaf highlighted
- [x] After mount, collapsing the branch containing the current page stays collapsed until reload; nothing reopens it on client-side navigation
- [x] Legacy collapse assertions are replaced by their opposites and the suite is green

## Comments

Implemented on branch `sidebar`, red-first at both pre-agreed seams. Pure seam: `computeActiveRoute` now returns the active Leaf's node path plus ancestor node paths — Full-path keys matching how Drawer state identifies nodes — replacing bare segments for both highlighting and expansion, which also removes cross-branch ambiguity for identically named segments. Component seam: the legacy-trigger suite became "user-managed Drawer lifecycle" — leaf navigation keeps every Drawer open, content clicks are inert on any viewport (`handleContentClick` and the matchMedia helper deleted), and overlay close (button or Escape) only unmounts the overlay. Mount-time auto-expand initializes `expandedDrawers` from `computeActiveRoute(pathname, routes).ancestors` in the lazy `useState` initializer: it runs exactly once per mount from the same computation that drives highlighting, nothing re-forces Drawers open afterwards, and a full reload remounts and re-derives (asserted via an unmount/remount test). A two-axis review pass afterwards renamed `walk`'s banned `depth` parameter to `level`, extracted a shared `buildNodePath` helper for the two node-path construction sites, made the leaf highlight compare node paths like everything else, dropped the banned word "branch" from a test name, and added the reload-remount and closed-Drawers content-click no-op assertions. Full suite: 152 passed; typecheck clean; eslint clean (one pre-existing Table.tsx warning).

