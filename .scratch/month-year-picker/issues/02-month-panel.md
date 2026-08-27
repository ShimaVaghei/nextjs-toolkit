# 02 — Month panel with immediate return

**What to build:** The month panel shows 12 months in a 3×4 grid. The currently selected month is highlighted. Clicking a month sets the year+month on the draft and immediately returns to the day grid showing the selected month. The header label remains clickable to re-open the overlay.

**Blocked by:** 01 — Year panel with decade navigation

**Status:** ready-for-agent

- [ ] Month panel renders a 3×4 grid of month names
- [ ] Currently selected month is visually highlighted
- [ ] Clicking a month calls `onDraftChange` with the new date string and returns to day grid
- [ ] Day grid reflects the selected year and month after return
- [ ] Header label remains visible and clickable after month selection
- [ ] Tests for DateField covering: month panel renders after year selection, month grid layout, month selection returns to day grid with correct month/year, header remains clickable
