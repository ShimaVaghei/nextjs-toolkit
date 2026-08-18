Status: ready-for-agent

# AppLayout — Fixed Left Navigation Shell with Mobile Overlay

## Problem Statement

The sidebar navigation component exists but is standalone: it isn't wired into the app, and its own spec declared sticky/fixed positioning out of scope, leaving consumers to drop it into any layout themselves. As a result there is no app shell at all — the root layout renders pages with no navigation. The user wants the sidebar to become the app's layout: a navigation column pinned to the left that pushes the page content to the right as its panels expand, and on mobile, a fullscreen navigation overlay opened from a hamburger button.

## Solution

The `Sidebar` component is renamed to `AppLayout` and becomes the app's shell. It accepts `routes` and `children`. On desktop (`md`+), the navigation column is `position: sticky` inside a flex row: it stays pinned to the left edge while the page scrolls, its expanding panels naturally push the content column right, and it scrolls internally when its Route list is taller than the viewport. Below `md`, the sidebar is hidden; `AppLayout` renders a mobile-only top bar with a hamburger button that opens the navigation as a fullscreen overlay. The overlay keeps the existing drill-down behavior (Level 1 → Level 2 → Level 3, one level visible at a time) and closes via a close button, the Esc key, or navigation to a Leaf node. `AppLayout` is mounted in the root layout so every page in the app lives inside it, and the app's Routes come from a single seeded route config module.

## User Stories

1. As a user, I want the navigation column to always be visible on the left on desktop, so that I can reach every section from any page.
2. As a user, I want the navigation column to stay pinned to the left edge while the page content scrolls, so that I never lose my place in the navigation.
3. As a user, I want the page content to sit to the right of the navigation column, so that the sidebar never covers it.
4. As a user, I want the content to be pushed further right as a Collapsible section expands and new panels slide in, so that the content always stays clear of the growing sidebar.
5. As a user, I want the navigation column to scroll internally when the Route list is taller than the viewport, so that I can still reach every Route.
6. As a user, I want the navigation column's width capped, so that deeply nested Levels don't push the content off-screen.
7. As a mobile user, I want the sidebar hidden by default so the page content takes the full width, so that I have maximum space on a small screen.
8. As a mobile user, I want a hamburger button in a top bar to open the navigation, so that I can still reach every section.
9. As a mobile user, I want the opened navigation to appear as a fullscreen overlay, so that I can focus entirely on navigating.
10. As a mobile user, I want the same drill-down behavior inside the overlay (Level 1, then Level 2, then Level 3), so that deep navigation works on a small screen.
11. As a mobile user, I want a close button in the overlay to dismiss it, so that I can return to the page content.
12. As a mobile user, I want to press Esc to dismiss the overlay, so that closing is possible without a pointer.
13. As a mobile user, I want the overlay to close automatically when I navigate to a Leaf node, so that I land directly on the content I chose.
14. As a mobile user, I want the page behind the overlay to stay locked from scrolling, so that I don't accidentally scroll the content while navigating.
15. As a mobile user, I want the overlay to scroll internally if the navigation is taller than the viewport, so that every Route remains reachable.
16. As a user, I want the active Leaf node highlighted in the navigation, so that I can see where I am — whether on desktop or inside the overlay.
17. As a user, I want ancestor nodes of the active Leaf highlighted with reduced opacity, so that I can trace the hierarchy I'm inside.
18. As a keyboard user, I want to Tab through the navigation items and press Enter or Space to expand a Collapsible section or navigate to a Leaf node, so that I can use the sidebar without a mouse.
19. As a user, I want the mobile top bar to be hidden on desktop, so that it doesn't take up space where the sidebar is always visible.
20. As a developer, I want `AppLayout` to accept a `routes: Route[]` prop and a `children: ReactNode` prop, so that it composes the navigation with the page content.
21. As a developer, I want `AppLayout` mounted in the root layout, so that every page in the app is wrapped in the shell without per-page wiring.
22. As a developer, I want the app's Routes defined in one seeded route config module, so that the layout and future pages share a single source of truth.
23. As a developer, I want `AppLayout` to render the mobile top bar and hamburger itself, so that call sites don't need their own trigger or open state.
24. As a developer, I want the existing navigation logic (active state via `usePathname`, panel animation, post-navigation collapse to Level 1, empty-routes handling) carried over unchanged, so that the nav behavior doesn't regress.
25. As a developer, I want the `Route` type and `computeActiveRoute` helper still exported, so that consumers and tests keep their existing contracts.
26. As a user, I want the navigation to degrade gracefully when the `routes` array is empty, so that the layout never crashes.

## Implementation Decisions

- **Component contract**: The existing navigation component is renamed to `AppLayout` and its props widen to `{ routes: Route[]; children: ReactNode }`. `routes` stays required; `children` is the page content.
- **Layout mechanism**: Desktop uses `position: sticky` in a flex row, not `position: fixed`. The navigation column is a self-starting sticky child constrained to viewport height with its own vertical scroll; the content is a flexible sibling. Because the nav column is in-flow, its width changes as panels expand and the content is pushed right with no JS width measurement.
- **Panel width cap**: The navigation column keeps its existing max width (up to three panels), so expansion pushes content only up to that bound.
- **Mobile behavior**: Below the `md` breakpoint the navigation column and its panels are not rendered as a fixed column. Instead `AppLayout` renders a mobile-only top bar containing a hamburger button.
- **Overlay**: The hamburger opens a fullscreen overlay that renders the same drill-down navigation as today. Open/close state is local to `AppLayout`.
- **Overlay dismissal**: The overlay closes on (1) a close button, (2) the Esc key, and (3) navigation to a Leaf node. The existing post-navigation collapse path is reused to also close the overlay.
- **Scroll lock**: While the overlay is open on mobile, the page behind it is prevented from scrolling; the overlay itself scrolls internally.
- **Carried over unchanged**: Drill-down expansion state machine, panel slide animation, `computeActiveRoute`-driven active/ancestor highlighting, accessibility semantics (`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`), and empty-routes handling.
- **Routes config**: A single seeded `Route[]` config module provides the app's navigation. The root layout imports it and passes it to `AppLayout`. Seed values are placeholders, grown as pages are added.
- **Root layout mounting**: `AppLayout` wraps the root layout's `children`, so every page renders inside the shell.
- **No new ADR**: The decisions here (sticky over fixed, fullscreen overlay on mobile) are component-level and cheap to reverse; the domain term `AppLayout` is recorded in the glossary instead.

## Testing Decisions

- **What makes a good test**: Test external behavior — rendered navigation items, panel visibility after clicks, overlay open/close, navigation calls through the mocked router — not internal state. Prefer assertions on visible behavior and ARIA state over CSS class names; retain class assertions only where they encode user-visible behavior (e.g., visibility on mobile).
- **Module tested**: `AppLayout` as a single component-level seam. There is no e2e infrastructure, and the root layout is a server component outside the render-test seam, so the component boundary is the top of the test pyramid.
- **Prior art**: The existing `Sidebar.test.tsx` suite (Vitest + React Testing Library, mocked `next/navigation`). It is updated in place: renamed with the component, every render passes `children`, and the mobile tests open the overlay before asserting drill-down behavior.
- **Coverage to preserve**: Level 1 always visible on desktop; panel opens/closes on click; deeper panels reset on new parent click; Leaf click navigates via the router and collapses to Level 1; active Leaf and ancestor highlighting; keyboard focus/Enter/Space; `computeActiveRoute` correctness through the component.

## Out of Scope

- Authoring real page content — the home page stays as its empty placeholder; this feature only provides the shell around it.
- E2E/browser tests for the sticky layout or overlay.
- Persisting panel or overlay state across route changes beyond today's post-navigation collapse behavior.
- New theming — reuses the existing neutral palette and dark-mode CSS variables.
- Accessibility work beyond the current level (e.g., arrow-key tree traversal, focus trap in the overlay).
- Wiring `AppLayout` into anything other than the root layout.
- Deleting the existing sidebar tests without replacing them — they are updated in place.

## Further Notes

- The component and test files are renamed (e.g., `components/Sidebar.tsx` → `components/AppLayout.tsx`).
- A new seeded route config module (e.g., `lib/routes.ts`) holds the app's `Route[]`.
- The root layout renders `AppLayout` with `routes` from that config, passing its own `children` through.
- `CONTEXT.md` already records the `AppLayout` term; its intro no longer describes the component as a "reusable toolkit".
- This spec supersedes the "sticky or fixed-position sidebar behavior" and "consumer places it in their layout" items that `.scratch/sidebar-navigation/spec.md` listed as out of scope. That spec remains as history for the navigation component itself.
