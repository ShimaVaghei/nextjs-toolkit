Status: ready-for-agent

## Problem Statement

The calendar popup's only way to navigate between months is the prev/next arrow buttons, which step one month at a time. To reach a date far in the past or future (e.g., "January 2020" from "August 2026"), the user must click the arrow 97 times. This is tedious and makes the calendar impractical for selecting dates that are more than a few months away.

## Solution

Add a month/year picker overlay to the calendar popup. Clicking the header label (e.g., "August 2026") replaces the day grid with a stacked two-step picker: a year panel first, then a month panel. The user picks a year from a 12-year grid (with decade navigation arrows), then picks a month from a 3×4 grid, and is immediately returned to the day grid showing the selected month and year. The overlay always opens at the year panel regardless of prior state.

## User Stories

1. As a user, I want to click the month/year header label in the calendar popup so that I can open the month/year picker overlay.
2. As a user, I want the overlay to open at a year panel showing a 12-year grid so that I can quickly select a year.
3. As a user, I want the year panel to show prev/next decade arrow buttons so that I can navigate to decades other than the current one.
4. As a user, I want the currently selected year to be visually highlighted in the year panel so that I can see which year is active.
5. As a user, I want to click a year in the year panel so that it advances me to the month panel for that year.
6. As a user, I want the month panel to show 12 months in a 3×4 grid so that I can select a month.
7. As a user, I want the currently selected month to be visually highlighted in the month panel so that I can see which month is active.
8. As a user, I want clicking a month in the month panel to immediately return me to the day grid showing the selected month and year, so that I can then pick a day.
9. As a user, I want the overlay to always open at the year panel so that the behavior is predictable every time I click the header.
10. As a user, I want the day grid to reflect the year and month I just selected so that I can pick a day in the correct month.
11. As a user, I want the calendar popup to remain open after I complete the month/year selection so that I can continue interacting with the day grid.
12. As a user, I want keyboard focus to move logically through the year and month panels so that I can use the keyboard to select a year and month.
13. As a user, I want pressing Escape while in the year or month panel to close the entire calendar popup so that I can cancel my selection.
14. As a user, I want the year panel to show the correct decade range based on the currently displayed year so that I can navigate relative to my current position.
15. As a user, I want the month panel to show abbreviated or full month names that are consistent with the calendar's existing locale formatting.
16. As a user, I want the month/year picker to work identically for date, datetime, date-range, and datetime-range Field kinds so that the experience is consistent across all date fields.
17. As a user, I want the min/max constraints to be respected in the year and month panels so that I cannot select a disabled month or year.
18. As a user, I want years outside the min/max range to appear disabled in the year panel so that I know which years are selectable.
19. As a user, I want months outside the min/max range to appear disabled in the month panel so that I know which months are selectable.
20. As a user, I want the prev/next decade arrows to be disabled when further navigation would go entirely outside the min/max range.
21. As a user, I want the year panel grid to show years in a consistent order (e.g., left-to-right, top-to-bottom) so that the layout is predictable.
22. As a user, I want the month panel grid to show months in calendar order (Jan–Mar row 1, Apr–Jun row 2, Jul–Sep row 3, Oct–Dec row 4) so that the layout is intuitive.
23. As a user, I want the header label to remain visible and clickable even after I complete a month/year selection so that I can change my selection again.
24. As a user, I want the month/year picker overlay to be visually distinct from the day grid so that I can tell which panel I am interacting with.
25. As a user, I want the transition between year panel and month panel to feel smooth and immediate so that the interaction feels responsive.

## Implementation Decisions

- The `CalendarPopup` component gains internal state to track which overlay panel is active: `none`, `year`, or `month`. When `none`, the day grid renders as before. When `year` or `month`, the respective panel replaces the day grid.
- The header label becomes a clickable button that opens the year panel. The existing prev/next month arrow buttons remain alongside it.
- The year panel renders a 12-year grid with prev/next decade arrow buttons. The decade range is derived from `draftYear`.
- The month panel renders a 3×4 grid of month names. Month abbreviations follow the existing locale conventions in the calendar.
- Both panels respect `min`/`max` constraints: years or months outside the allowed range render as disabled.
- Selecting a year transitions from year panel to month panel. Selecting a month transitions from month panel back to the day grid and calls `onDraftChange` with the new date string.
- The overlay state resets to `none` when the calendar popup closes (Escape, outside click, or Commit/Cancel).
- This feature applies to all four date-kind Field components: DateField, DateTimeField, DateRangeField, DateTimeRangeField. No per-kind customization is needed since `CalendarPopup` is shared.

## Testing Decisions

- Tests exercise the feature through the existing `DateHarness`, `DateTimeHarness`, `DateRangeHarness`, and `DateTimeRangeHarness` components, which render the `CalendarPopup` indirectly. No new test harnesses are needed.
- Test the year panel: click header label, assert 12-year grid renders, click a year, assert month panel appears.
- Test the month panel: complete year selection, assert 3×4 month grid renders, click a month, assert day grid reappears with the correct month/year.
- Test decade navigation: click prev/next arrows in year panel, assert year grid updates.
- Test min/max constraints: configure a Field with min/max, assert years/months outside range are disabled.
- Test overlay closes on Escape from year or month panel.
- Test that the feature works across all four date kinds.
- Prior art: existing calendar widget tests in `Field.test.tsx` (lines 3798–4576) test day grid interactions through the same harnesses.

## Out of Scope

- Changing the visual styling or layout of the existing day grid.
- Adding time picker controls to the year/month panels (time picking remains in the day grid view for datetime kinds).
- Custom locale or internationalization of month names beyond what the calendar already supports.
- Scrollable year lists or type-to-search in the year panel.
- Animated transitions between panels (functional transitions only).

## Further Notes

- ADR `0001-stacked-year-first-month-picker.md` documents the design choice of stacked year-first over side-by-side layout.
- The `CONTEXT.md` glossary has been updated with terms: Month/year picker overlay, Year panel, Month panel.
