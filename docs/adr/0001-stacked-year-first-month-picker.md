# Stacked year-first month/year picker

The calendar popup's month/year picker uses a stacked two-step flow — years first, then months — instead of a side-by-side two-panel layout. Clicking the header label opens the year panel; picking a year advances to the month panel; picking a month returns to the day grid.

The stacked approach was chosen because it keeps the popup compact (one panel at a time), avoids visual clutter, and matches the existing left-arrow navigation pattern. A side-by-side layout would show both dimensions at once but demands more horizontal space and adds cognitive load when the user only needs to change one dimension. Starting at years (not months) ensures a predictable entry point — the user can reach any month in exactly two clicks from any starting point.
