# 02 — Desktop: sticky left column that pushes content

**What to build:** On desktop, the navigation column is pinned to the left edge of the viewport and stays visible while the page scrolls; it scrolls internally when its Route list is taller than the screen. Expanding a Collapsible section grows the column and pushes the content column to the right, capped at the three-panel maximum width.

**Blocked by:** 01 — AppLayout shell with a content area

**Status:** done

- [x] Navigation column uses `position: sticky` on `md`+ — stays visible while the page scrolls
- [x] Navigation column scrolls internally when taller than the viewport
- [x] Expanding a Collapsible section pushes the content column right as panels appear
- [x] Column width capped at three panels (existing maximum)
- [x] Tests assert the sticky column and pushed content structure
