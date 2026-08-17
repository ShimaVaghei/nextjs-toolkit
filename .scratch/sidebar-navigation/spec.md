Status: ready-for-agent

# Multi-Level Collapsible Sidebar Navigation

## Problem Statement

The project needs a reusable sidebar navigation component that can display hierarchical routes (up to 3 levels deep) with smooth expand/collapse animations. The sidebar must support a multi-panel drawer pattern on desktop, a drill-down pattern on mobile, and correctly highlight the active route and its ancestors based on the current URL.

## Solution

A `Sidebar` React component that accepts a `routes: Route[]` prop and renders a multi-panel drawer. Level 1 routes are always visible. Clicking a Level 1 route opens a second panel to the right showing Level 2 routes. Clicking Level 2 opens a third panel for Level 3. Panels slide in from the left using CSS grid transitions. On mobile (below `md` breakpoint), only the deepest open panel is visible at full width. Active state is derived from `usePathname()` — leaf nodes highlight boldly, ancestors highlight with reduced opacity. After a leaf node is clicked, the drawer collapses back to Level 1.

## User Stories

1. As a user, I want to see top-level navigation routes in the sidebar, so that I can orient myself within the application.
2. As a user, I want to click a Level 1 route that has children and see a new panel slide in showing its children, so that I can explore nested navigation options.
3. As a user, I want to click a Level 2 route that has children and see a third panel slide in showing Level 3 routes, so that I can reach deeply nested content.
4. As a user, I want panels to animate smoothly when opening and closing, so that the navigation feels polished and not jarring.
5. As a user, I want clicking a different Level 1 route to close all deeper panels and open the new Level 2 panel, so that I don't get confused by stale open panels.
6. As a user, I want clicking a different Level 2 route to close the Level 3 panel and open the new Level 3 panel, so that only the relevant children are shown.
7. As a user, I want to click a leaf node and navigate to its full URL (concatenation of all ancestor paths), so that I reach the correct page.
8. As a user, I want the drawer to collapse back to Level 1 after I click a leaf node, so that the sidebar returns to its default state.
9. As a user, I want the currently active leaf node to be visually highlighted with a bold style, so that I can see where I am.
10. As a user, I want ancestor nodes of the active leaf to also be highlighted but with reduced opacity, so that I can trace the navigation hierarchy.
11. As a user, I want non-active, non-expanded parent nodes to show a collapsed indicator (e.g., chevron), so that I know they can be expanded.
12. As a user, I want expanded parent nodes to show an expanded indicator (e.g., rotated chevron), so that I know they are currently open.
13. As a user, I want each panel to have a fixed width (`w-64`), so that the layout is predictable and consistent.
14. As a user, I want the sidebar content to scroll vertically when it exceeds the viewport height, so that I can access all routes.
15. As a mobile user, I want only the deepest open panel to be visible at full width, so that I have enough touch target area on small screens.
16. As a mobile user, I want the same slide animation on panel transitions, so that the experience is consistent across devices.
17. As a keyboard user, I want to Tab through all interactive items in the sidebar, so that I can navigate without a mouse.
18. As a keyboard user, I want to press Enter or Space on a parent node to toggle its panel, so that I can expand/collapse without a mouse.
19. As a keyboard user, I want to press Enter or Space on a leaf node to navigate, so that I can reach content without a mouse.
20. As a developer, I want the sidebar to accept a `routes: Route[]` prop with `Route = { path: string, label: string, children?: Route[] }`, so that I can pass any route tree.
21. As a developer, I want the sidebar to be an inline component (not fixed-position), so that I can place it inside any layout.
22. As a developer, I want the active state to be derived automatically from `usePathname()`, so that I don't need to pass an active path prop.
23. As a developer, I want the sidebar to NOT auto-expand panels on direct URL navigation, so that the initial state is always collapsed.
24. As a developer, I want the full navigation path to be computed by concatenating ancestor `path` values joined by `/`, so that the routing works with Next.js file-based routing.
25. As a user, I want parent nodes that are not leaf nodes to be visually distinct from leaf nodes (e.g., no navigation cursor, different hover style), so that I understand they only expand/collapse.
26. As a user, I want the expand/collapse animation to use the CSS grid trick (`grid-template-rows: 0fr → 1fr`), so that the height transition is smooth without estimating content height.
27. As a user, I want panels to slide in from the left direction, matching the sidebar's position, so that the animation feels spatially correct.
28. As a developer, I want the `Route` type exported from the component module, so that consumers can type their route data.
29. As a user, I want a visual separator or spacing between Level 1 items, so that the top-level navigation is easy to scan.
30. As a user, I want the sidebar to handle an empty `routes` array gracefully without errors, so that the component is robust.

## Implementation Decisions

- **Route type**: `Route = { path: string, label: string, children?: Route[] }`. Every node has a `path`; only leaf nodes (no `children`) trigger navigation.
- **Full path computation**: Concatenate all ancestor `path` values from root to leaf, joined by `/`. This is the URL the user navigates to.
- **Active state**: Derived internally via `usePathname()` from Next.js. No external active path prop.
- **Panel animation**: CSS grid trick — `grid-template-rows: 0fr` (collapsed) to `1fr` (expanded) with `transition`. No external animation library.
- **Panel width**: Each panel is `w-64` (16rem). Up to 3 panels = `w-[48rem]` max.
- **Animation direction**: Panels slide in from the left.
- **Active styling hierarchy**: Leaf node gets bold/prominent highlight. Ancestor nodes get muted/opacity highlight.
- **Expand/collapse indicators**: Chevron icons on parent nodes, rotated when expanded.
- **Click behavior on new parent**: Clicking a parent at any level closes all deeper panels before opening the new panel.
- **Post-navigation behavior**: After a leaf node click, collapse the drawer back to Level 1 only.
- **Mobile behavior**: Below Tailwind `md` breakpoint (768px), only the deepest open panel is visible at full width. Same animation.
- **Accessibility**: Basic — tab-focusable items, `role="treeitem"` on nodes, `aria-expanded` on parent nodes, `role="tree"` on the container.
- **Positioning**: Inline component, not fixed-position. Consumer places it in their layout.
- **Auto-expand on direct navigation**: No. Drawer starts collapsed at Level 1 regardless of current URL.
- **New seam — `computeActiveRoute`**: A pure function that takes `(pathname: string, routes: Route[])` and returns the set of route paths that should be highlighted (the matched leaf + all its ancestors). This is the single new seam for testing.

## Testing Decisions

- **What makes a good test**: Test external behavior (rendered items, panel visibility after clicks, active highlights, navigation calls) not internal state.
- **`computeActiveRoute` seam**: Unit test the pure function with various route trees and pathnames. Cover: leaf match, ancestor highlight, no match, nested paths, multiple levels.
- **`Sidebar` component seam**: Render tests with a mock `usePathname`. Cover: Level 1 always visible, panel opens on click, deeper panels close on new parent click, leaf click navigates and collapses, active styling applied, mobile responsive behavior.
- **Prior art**: No existing tests in the codebase. This will be the first test setup — use Vitest + React Testing Library as the standard for Next.js projects.

## Out of Scope

- Keyboard arrow-key navigation (tree traversal with arrow keys)
- Drag-and-drop reordering of routes
- Dynamic route loading / lazy rendering of panels
- Icons per route (only chevron for expand/collapse)
- Search/filter within the sidebar
- Sticky or fixed-position sidebar behavior
- Animation on the sidebar width change itself (panels animate in/out, the container width snaps)
- Dark mode specific styles (follows system preference via existing CSS variables)

## Further Notes

- The `Sidebar` component lives at `components/Sidebar.tsx`.
- The `Route` type should be exported from the same module.
- The `computeActiveRoute` function should be exported for external use and testing.
- No external dependencies are required — pure React + Tailwind CSS.
- The component should be "use client" since it uses `usePathname()` and local state.
