# 03 — Mobile: top bar, hamburger, fullscreen overlay

**What to build:** On small screens the navigation is hidden and a mobile-only top bar with a hamburger button appears. Tapping it opens a fullscreen overlay containing the same drill-down navigation. The overlay closes via its close button, the Esc key, or navigating to a Leaf node (which also collapses the panels back to Level 1). The page behind the overlay is locked from scrolling while it's open, and the overlay scrolls internally.

**Blocked by:** 02 — Desktop: sticky left column that pushes content

**Status:** done

- [x] Mobile-only top bar with hamburger button; hidden on desktop
- [x] Hamburger opens a fullscreen overlay with the drill-down navigation (behavior matches existing)
- [x] Overlay closes via close button
- [x] Overlay closes via Esc key
- [x] Overlay closes when navigating to a Leaf node; panels collapse to Level 1
- [x] Background scroll locked while overlay open; overlay scrolls internally
- [x] Mobile tests reworked to open the overlay first; new tests for close paths and scroll lock
