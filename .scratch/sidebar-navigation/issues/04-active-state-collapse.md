# 04 — Active state + post-navigation collapse

**What to build:** The active leaf node is highlighted with a bold style. Its ancestor nodes are highlighted with muted opacity. After a leaf node is clicked, the sidebar navigates to the full path (concatenation of ancestor paths) and collapses the drawer back to Level 1. Active state is derived from `usePathname()`.

**Blocked by:** 01 — computeActiveRoute pure function + unit tests, 03 — Level 2 → Level 3 expansion + deeper-panel reset

**Status:** ready-for-agent

- [ ] Integrate `computeActiveRoute` with `usePathname()`
- [ ] Active leaf node gets bold/prominent highlight
- [ ] Ancestor nodes of active leaf get muted/opacity highlight
- [ ] Leaf node click navigates to full path via Next.js `useRouter`
- [ ] After leaf click, drawer collapses to Level 1 only
- [ ] Full path computed by concatenating ancestor `path` values joined by `/`
- [ ] Non-active non-expanded parents show collapsed chevron
- [ ] Expanded parents show rotated chevron
- [ ] Parent nodes visually distinct from leaf nodes (cursor, hover)
