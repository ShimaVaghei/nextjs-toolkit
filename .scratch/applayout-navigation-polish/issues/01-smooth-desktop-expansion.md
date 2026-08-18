# 01 — Smooth panel expansion on desktop

**What to build:** On desktop (md+), expanding and collapsing panels grows and shrinks the sidebar column smoothly, so the content area glides right instead of jumping. Mobile behaviour is unchanged — panels there still stack full-width with the existing height animation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] On md+, expanding a Level 1 Collapsible section widens the sidebar column with a smooth width transition (~300ms ease-in-out, matching the existing grid animation timing) rather than snapping; the content area is pushed right smoothly.
- [x] Collapsing the panels (toggling the same section closed, clicking a Leaf, or any other collapse path) shrinks the column back smoothly.
- [x] Panel labels do not wrap or reflow mid-animation.
- [x] Mobile behaviour is unchanged: panels still render full-width stacked with the existing height animation, no horizontal push.

## Comments

Implemented via `panelGridClasses` in `components/AppLayout.tsx`: the Level 2/3 panel grids now transition `grid-template-columns` (`md:grid-cols-[0fr]`/`[1fr]`) in addition to `grid-template-rows`, so the sidebar column widens/narrows smoothly on md+. The panel bodies are `md:w-max` (natural width, clipped by the grid's `overflow-hidden`) so labels never reflow mid-animation; on mobile the `w-full`/`grid-rows` height animation is unchanged. The Level 2 panel uses `hidden md:grid` (rather than `md:block`) so it stays a grid across the Level-3-open collapse path and animates rather than snapping. Tests added in `components/AppLayout.test.tsx`; ADR-0001 updated to describe the width transition.