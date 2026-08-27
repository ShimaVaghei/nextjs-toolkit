# 01 — Year panel with decade navigation

**What to build:** Clicking the header label in the Calendar popup opens a year panel showing a 12-year grid with prev/next decade arrow buttons. The currently selected year is highlighted. Clicking a year transitions to the month panel (placeholder). Pressing Escape from the year panel closes the calendar popup. The overlay always opens at the year panel.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] CalendarPopup gains internal overlay state (`none` | `year` | `month`)
- [ ] Header label becomes a clickable button that sets overlay to `year`
- [ ] Year panel renders a 12-year grid derived from `draftYear`
- [ ] Prev/next decade arrow buttons navigate between decades
- [ ] Currently selected year is visually highlighted
- [ ] Clicking a year sets overlay to `month`
- [ ] Escape from year panel closes the calendar popup
- [ ] Overlay resets to `none` when calendar closes
- [ ] Tests for DateField covering: header click opens year panel, year grid renders, decade navigation, year selection transitions to month panel, Escape closes popup
