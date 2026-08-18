# 01 — Smooth panel expansion on desktop

**What to build:** On desktop (md+), expanding and collapsing panels grows and shrinks the sidebar column smoothly, so the content area glides right instead of jumping. Mobile behaviour is unchanged — panels there still stack full-width with the existing height animation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] On md+, expanding a Level 1 Collapsible section widens the sidebar column with a smooth width transition (~300ms ease-in-out, matching the existing grid animation timing) rather than snapping; the content area is pushed right smoothly.
- [ ] Collapsing the panels (toggling the same section closed, clicking a Leaf, or any other collapse path) shrinks the column back smoothly.
- [ ] Panel labels do not wrap or reflow mid-animation.
- [ ] Mobile behaviour is unchanged: panels still render full-width stacked with the existing height animation, no horizontal push.