Status: resolved

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

## Answer

Fixed via hypothesis 1. The FilterPopover now measures the trigger when the
popover opens and exports a pure helper `resolvePopoverSide(triggerRight,
popoverWidth, viewportWidth)` (`components/table/Table.tsx`) — the anchor flips
from `left-0` to `right-0` when `triggerRight + popoverWidth > viewportWidth`.
An unmeasurable viewport (jsdom zeroes) keeps the default left anchor, so all
existing jsdom tests are unaffected. Verified in headless Chrome at 1280×800 on
`/table/server`: the Score popover now ends at 1255px (inside the viewport) with
no scroll jump, while the first column still anchors `left-0`. Regression test:
"flips the filter popover anchor to the right edge…" in Table.test.tsx.

