# Next.js Toolkit — Sidebar Navigation

The app's fixed left sidebar navigation and content area for hierarchical route structures.

## Language

**Route**:
A node in the navigation tree. Every Route has a `path` (string), `label` (string), and optional `children` (Route[]). Only leaf nodes (no children) trigger navigation.
_Avoid_: NavItem, MenuItem, Link

**Leaf node**:
A Route with no `children`. The only nodes that navigate the user when clicked.
_Avoid_: terminal, endpoint

**Full path**:
The concatenation of all ancestor `path` values from root to leaf, joined by `/`. This is the actual URL the user navigates to.
_Avoid_: resolvedPath, fullPath

**Level**:
Depth in the tree. Level 1 is top-level (always visible). Level 2 expands under a Level 1 click. Level 3 expands under a Level 2 click.
_Avoid_: depth, tier

**Collapsible section**:
A non-leaf Route whose children are hidden until clicked. Toggles open/closed with animation.
_Avoid_: expandable, toggleable

**AppLayout**:
A component that composes the navigation sidebar (rendered from Routes, seeded in `lib/routes.ts`) with the page content passed as `children`. The sidebar is pinned to the left and pushes the content to the right as it expands. Mounted in the root layout, so every page in the app lives inside it.
_Avoid_: SidebarLayout, AppShell, wrapper, frame
