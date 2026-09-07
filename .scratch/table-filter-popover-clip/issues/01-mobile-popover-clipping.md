Status: needs-triage

# Table filter popovers clip inside the mobile scroll container

## Context

Found while diagnosing the iPhone SE layout break (`/table/local`). The fix for that bug
wrapped the `<table>` in an `overflow-x-auto` container (`components/table/Table.tsx`).
Filter popovers are `absolute`-positioned inside header cells, so on narrow viewports
they now clip at the scroll container's right edge instead of the viewport's. They remain
reachable by scrolling the container horizontally, but that is poor UX — the user may not
realize the popover continues off-screen.

Measured at 375×667 (iPhone SE) on `/table/local`: first filter popover width 192px,
container visible right edge at 87px → clipped.

## Possible directions

- Render popovers via a portal/floating layer (like the Calendar popup does) so they
  escape the scroll container.
- Flip the popover's anchor side (right-0) for columns near the right edge.
- Accept the trade-off and document it.
