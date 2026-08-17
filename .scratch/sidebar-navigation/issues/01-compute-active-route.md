# 01 — computeActiveRoute pure function + unit tests

**What to build:** A pure function `computeActiveRoute(pathname: string, routes: Route[])` that returns the set of Route paths that should be highlighted — the matched leaf node plus all its ancestors. Fully unit-tested in isolation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Export `Route` type from the module
- [ ] Implement `computeActiveRoute` — returns matched leaf path + all ancestor paths
- [ ] Unit test: leaf match at Level 1
- [ ] Unit test: leaf match at Level 2 with ancestor highlight
- [ ] Unit test: leaf match at Level 3 with ancestor highlight
- [ ] Unit test: no match returns empty set
- [ ] Unit test: partial path match does not falsely highlight
- [ ] Unit test: multiple Level 1 routes, only matching branch highlighted
