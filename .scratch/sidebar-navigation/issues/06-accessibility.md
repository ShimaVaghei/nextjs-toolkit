# 06 — Accessibility

**What to build:** Full keyboard navigation and ARIA semantics. Tab through all items. Enter/Space toggles parent nodes and navigates leaf nodes. Proper tree roles.

**Blocked by:** 04 — Active state + post-navigation collapse

**Status:** ready-for-agent

- [ ] Container has `role="tree"`
- [ ] Each item has `role="treeitem"`
- [ ] Parent nodes have `aria-expanded` reflecting open/closed state
- [ ] All interactive items are tab-focusable
- [ ] Enter or Space on parent toggles panel
- [ ] Enter or Space on leaf navigates
