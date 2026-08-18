# 04 — Mobile: Back icon in the overlay header

**What to build:** The Mobile overlay header shows a Back icon in place of the "Navigation" title whenever the user has drilled below Level 1. Clicking it returns to the previous Level. At Level 1 the Back icon is hidden and the close button still closes the overlay.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Mobile overlay header shows a Back icon instead of the "Navigation" title whenever a panel is expanded (user is below Level 1).
- [ ] At Level 1 the Back icon is hidden; the close button remains and closes the overlay.
- [ ] Clicking Back while at Level 3 returns to Level 2 (the Level 2 panel renders again).
- [ ] Clicking Back while at Level 2 returns to Level 1 (the top-level list renders again).
- [ ] The overlay keeps its accessible name of "Navigation" so existing dialog queries still resolve.