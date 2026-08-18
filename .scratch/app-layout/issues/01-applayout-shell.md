# 01 — AppLayout shell with a content area

**What to build:** The sidebar navigation component becomes `AppLayout`, the app's layout component. It now accepts `routes` and `children`, rendering the existing navigation column next to a content column that displays the passed-in page content. All existing navigation behavior — drill-down panels, active-route highlighting, keyboard and screen-reader accessibility — keeps working exactly as before, and the test suite is updated to exercise the new contract.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Component and its test module are renamed to `AppLayout`
- [ ] `AppLayout` accepts `routes: Route[]` and `children: ReactNode`; `children` render beside the navigation column
- [ ] Existing navigation behavior (drill-down, active/ancestor highlighting, keyboard, accessibility semantics) is unchanged
- [ ] `Route` type and `computeActiveRoute` helper remain exported
- [ ] Test suite renders `AppLayout` with `children` everywhere, references renamed; all existing tests pass
