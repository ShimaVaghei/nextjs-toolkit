# 04 — Route section headings

**What to build:** Render Route sections as visual groups in the sidebar: a section's optional label appears as static text above its group of Routes — it cannot be focused, clicked, or navigated. A section without a label contributes no heading; an empty section renders nothing. Multiple sections stack vertically and have no effect on Full paths or navigation.

**Blocked by:** 01 — Sectioned route data model.

**Status:** ready-for-agent

- [x] A labeled section renders its label as static, non-focusable text above its group
- [x] Clicking a section label does nothing — it is not an interactive element
- [x] A section without a label renders no heading; only its routes
- [x] An empty section renders nothing at all
- [x] Multiple sections stack vertically; Full paths are unaffected by grouping

## Comments

Implemented on branch `sidebar`. `SidebarNav` now iterates `RoutesSection[]` directly instead of a flattened list: each non-empty section renders an optional static `<span>` heading (`pl-7` to align with route text, no tabindex/button/link, click is a no-op) above its own Level-1 `RouteTree` rooted at `basePath=""`, so Full paths are unchanged; empty sections render nothing, and the children-only early return now triggers when every section is empty. Desktop sidebar and Mobile overlay share the renderer, so both get headings. Ten new component tests cover the acceptance criteria (static heading placement, non-interactivity, unlabeled/empty sections, vertical stacking, path invariance, cross-section highlighting, per-section sibling counts, overlay parity). Full suite: 162 passed; typecheck and eslint clean.
