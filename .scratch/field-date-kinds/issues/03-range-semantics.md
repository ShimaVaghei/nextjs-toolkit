Type: grilling
Blocked by: 02
Status: open

## Question

Range-specific semantics: is a half-filled range (`from` set, `to` unset) Empty for `required`, or filled-but-invalid with its own message? How do `min`/`max` bind to a `{ from, to }` value — does `min` constrain `from`, `max` constrain `to`, plus an implied cross-end rule (`from <= to`)? And when a user picks ends out of order (picks a `to` earlier than `from`): swap, clamp, or reject?
