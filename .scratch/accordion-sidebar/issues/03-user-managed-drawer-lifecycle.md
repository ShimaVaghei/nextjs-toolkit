# 03 — User-managed Drawer lifecycle and mount-time auto-expand

**What to build:** Drawers become purely user-managed: navigating to a Leaf node, clicking page content, and closing the Mobile overlay no longer collapse anything — only clicking a Collapsible route toggles its own Drawer. Overlay close/reopen preserves which Drawers are open. On mount, the Drawers along the active route's ancestry open once so a direct landing on a deep Full path shows location in context; afterwards nothing forces them open until a full reload. This ticket deliberately inverts the legacy assertions that ticket 02 kept alive (post-leaf collapse, outside-click collapse, overlay reset-on-close).

**Blocked by:** 02 — Inline Drawer accordion replaces multi-panel flyouts.

**Status:** ready-for-agent

- [ ] Navigating to a Leaf node leaves every Drawer exactly as it was
- [ ] Clicking the page content never changes which Drawers are open, on any viewport
- [ ] Closing and reopening the Mobile overlay preserves the open Drawers
- [ ] Landing directly on a deep Full path opens the Drawers along its ancestry once on mount, with the active Leaf highlighted
- [ ] After mount, collapsing the branch containing the current page stays collapsed until reload; nothing reopens it on client-side navigation
- [ ] Legacy collapse assertions are replaced by their opposites and the suite is green
