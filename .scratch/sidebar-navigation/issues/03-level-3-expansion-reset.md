# 03 — Level 2 → Level 3 expansion + deeper-panel reset

**What to build:** Clicking a Level 2 parent opens a third panel showing Level 3 routes. Clicking a different Level 1 parent closes Level 2 and Level 3 panels before opening the new Level 2 panel. Clicking a different Level 2 parent closes the Level 3 panel before opening the new one.

**Blocked by:** 02 — Sidebar shell: Route type + Level 1 rendering + expand/collapse to Level 2

**Status:** ready-for-agent

- [ ] Level 2 parent click opens a third panel with Level 3 children
- [ ] Third panel uses same CSS grid animation
- [ ] Clicking a new Level 1 parent closes all deeper panels (Level 2 + Level 3)
- [ ] Clicking a new Level 2 parent closes the Level 3 panel
- [ ] Chevron rotation indicates expanded/collapsed state
- [ ] Up to 3 panels visible on desktop (`w-[48rem]` max)
