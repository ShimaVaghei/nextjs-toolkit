Type: grilling
Status: open

## Question

Surfaced by the calendar-popup prototype (04): a datetime-range pick currently carries **one** time-of-day applied to both ends. Should `datetime-range` keep that single shared time (start and end instants share hh:mm), or carry **independent times per end** — and if independent, what does the popup pane look like (two time controls?), what does the closed face render (`Aug 26, 2026, 3:17 PM – Aug 28, 2026, 9:00 AM`?), and how do the emitted ISO strings per end interact with the fixed-width serialization contract from 02?
