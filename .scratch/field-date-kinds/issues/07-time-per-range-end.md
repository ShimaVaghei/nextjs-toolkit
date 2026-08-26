Type: grilling
Status: resolved

## Question

Surfaced by the calendar-popup prototype (04): a datetime-range pick currently carries **one** time-of-day applied to both ends. Should `datetime-range` keep that single shared time (start and end instants share hh:mm), or carry **independent times per end** — and if independent, what does the popup pane look like (two time controls?), what does the closed face render (`Aug 26, 2026, 3:17 PM – Aug 28, 2026, 9:00 AM`?), and how do the emitted ISO strings per end interact with the fixed-width serialization contract from 02?

## Answer

- **Independent times per end win.** The value shape already holds two independent ISO instants — shared-time was a UI-only fiction that either forced `setValue` normalization silently destroying caller data, or left legal independent values unreachable and fighting a single control on reopen. Independent times express every case including shared ones; serialization needed zero changes since ticket 02 always interpreted each end's wall-clock separately.
- **Pane**: two labeled time controls ("Start time" / "End time") beside the month grid in the draft-with-commit summary/time pane; each applies to its own end's date. Only `DateTimeRangeField` shows them — `DateRangeField` stays date-only per its fixed-zero serialization.
- **Default**: picking a date seeds that end's draft time to 00:00 local, displayed immediately in its control ("12:00 AM") — Apply always lands complete instants, Empty/half-pick rules stay purely about dates.
- **Closed face**: each end formatted with the shared `DATETIME_DISPLAY_FORMAT`, joined with " – " (`Aug 26, 2026, 3:17 PM – Aug 28, 2026, 9:00 AM`). Seconds exist in stored values but display drops them, matching Table.
- Same-day ranges with start-after-end instants normalize via ticket 03's swap rule — instants swap wholesale, no new policy.
