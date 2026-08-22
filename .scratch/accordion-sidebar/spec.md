Status: ready-for-agent

# Single-panel accordion sidebar with Route sections

## Problem Statement

The sidebar currently opens each level of navigation in a new horizontal panel to the right of the previous one. Users drilling into a deep route see the sidebar sprawl across the screen, pushing the page content sideways; on mobile this becomes a drill-down with a Back icon that behaves completely differently from desktop. Navigating to a leaf also slams every panel shut, hiding where the user just went. And as the app grows, there is no way to visually group related top-level routes — everything is one flat list.

## Solution

One fixed-width sidebar where clicking a Collapsible route reveals its children directly beneath it as a Drawer that animates open in place. Any number of Drawers can be open at once, identically on desktop and inside the Mobile overlay — one interaction model everywhere. Drawers stay open after navigating, so the tree always shows the user's location, and landing on a deep URL by bookmark or refresh auto-opens the path to it. Top-level routes can be organized into labeled Route sections that act purely as visual groupings.

## User Stories

1. As a desktop user, I want clicking a Collapsible route to reveal its children directly beneath it, so that I can see parent and children together without a panel covering other content.
2. As a desktop user, I want the Drawer under a Collapsible route to animate smoothly open and closed, so that the tree feels fluid rather than jarring.
3. As a desktop user, I want any number of Drawers open at once, so that I can compare several branches without reopening them.
4. As a desktop user, I want clicking an open Collapsible route to close only its own Drawer, so that my other expanded branches are untouched.
5. As a power user, I want Level 3 (and deeper) routes to nest inline under their own parents, so that deep trees still live in one column.
6. As a desktop user, I want the sidebar to keep a constant width whether zero or five Drawers are open, so that page content never shifts while I navigate.
7. As a user who just navigated to a Leaf node, I want my open Drawers to remain open, so that the tree keeps showing where I am.
8. As a user clicking around the page content, I want my sidebar Drawers to stay exactly as I left them, so that stray clicks don't undo my navigation setup.
9. As a user arriving from a bookmark or shared link to a deep Full path, I want the Drawers along that route opened for me on load, so that I can see my location in context immediately.
10. As a user who deliberately collapsed the branch containing the current page, I want it to stay collapsed until I reload, so that the sidebar doesn't fight my choices.
11. As an active user, I want the current Leaf node highlighted boldly and its ancestors subtly dimmed, so that I can orient myself at a glance.
12. As a mobile user, I want the Mobile overlay to use the same expand-under-parent accordion as desktop, so that I only have to learn one navigation model.
13. As a mobile user, I want closing the overlay (close button or Escape) to preserve which Drawers were open, so that reopening continues where I left off.
14. As a mobile user, I want tapping a Leaf node to navigate and dismiss the overlay, so that I get to content in one gesture.
15. As a mobile user, I want the fullscreen overlay to lock background scroll while open and restore it when closed, so that the page doesn't scroll behind the menu.
16. As a keyboard user, I want every visible route item tab-focusable and operable, so that I can navigate without a mouse.
17. As a screen reader user, I want parents to expose `aria-expanded`, levels via `aria-level`, and position via `aria-setsize`/`aria-posinset`, so that I understand the tree structure.
18. As a sighted user, I want a parent's chevron to rotate when its Drawer is open, so that expansion state is visible beyond indentation.
19. As a maintainer of the route seed, I want to group top-level Routes into Route sections with optional labels, so that a growing sidebar stays scannable.
20. As a user, I want section labels rendered as static headings above their groups, so that I get structure without fake clickable headers.
21. As a maintainer, I want sections without labels to render no heading, so that grouping stays invisible until it earns a caption.
22. As a maintainer, I want empty sections to render nothing at all, so that placeholder data never leaves stray artifacts.
23. As a user, I want Full paths built exactly as before regardless of sections, so that URLs never change because of regrouping.
24. As a user of an app with no routes configured, I want just the page content, so that an empty sidebar never blocks the page.
25. As a mobile user, I want the hamburger and top bar unchanged, so that opening navigation feels familiar.
26. As a developer, I want the drill-down Back icon removed entirely, so that no dead UI or state lingers from the retired model.

## Implementation Decisions

- **AppLayout props change.** The `routes` prop becomes a list of Route sections. A section carries an optional label plus the list of Routes in that section. The type is exported alongside `Route` from the AppLayout module; the seeded data keeps importing types from there per existing convention.
- **Seed data.** `appRoutes` wraps today's routes (Home, Table → Local/Server) in a single label-less Route section, so the visible sidebar starts unchanged.
- **One renderer, two containers.** Desktop sidebar and Mobile overlay render the same single-panel accordion tree; the horizontal multi-panel machinery, the hidden/shown panel choreography, and the drill-down header (Back icon) are deleted.
- **Drawer state.** Expansion is a set of nodes identified by their Full path (bare segments are ambiguous across branches). Clicking a Collapsible route toggles membership for its own node only. No cascading closes anywhere.
- **Drawer lifecycle.** Nothing resets Drawers: not leaf navigation, not outside clicks on desktop, not overlay close/reopen. All three old reset paths are removed.
- **Mount-time auto-expand.** Once on mount, the Drawers along the active route's ancestry are opened, derived from the same active-route computation that drives highlighting. After mount the tree is purely user-managed. This deliberately reverses ADR 0001's "no auto-expand" clause.
- **Geometry.** Fixed-width sidebar (`w-64`-class); the growth-to-`max-w-3xl` behavior and its tests are removed. Deeper Levels indent within that width. Page content column untouched.
- **Animation.** Vertical-only reveal reusing the repo's established CSS grid transition (`0fr → 1fr` rows, ~300ms ease-in-out); chevron rotates 90° when open. No horizontal column animation remains.
- **Route sections rendering.** Sections stack vertically; the optional label renders as static text (not focusable, never navigates) above its group; missing label renders nothing; empty section renders nothing.
- **Path resolution.** The active-route computation walks all sections transparently — sections contribute nothing to Full paths — and its exported signature accepts the sectioned shape.
- **Accessibility preserved.** `tree`/`treeitem`/`group` roles, `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`, and tab focus all carry over; sibling counts are computed within each visible group (each Drawer).
- **Domain docs already updated.** Glossary gained Route section and Drawer, renamed Collapsible section → Collapsible route, rewrote AppLayout and Mobile overlay entries, and retired Collapse and Back icon. ADR 0002 supersedes ADR 0001.

## Testing Decisions

- **What makes a good test here:** assert external behavior through accessible roles and names — visibility of children after clicking a parent, `aria-expanded` toggles, `router.push` arguments, overlay presence and body scroll state. Class-name assertions are acceptable only where they *are* the animation contract (the grid transition classes), matching existing convention, since CSS transitions aren't observable in jsdom.
- **Seams (both existing, none new):**
  - Component seam: render AppLayout with Testing Library using the established `next/navigation` and `matchMedia` mocks. Covers stories 1–18, 20–26.
  - Pure-function seam: unit tests for active-route resolution against the sectioned input, including "sections are transparent" cases. Covers story 23's matching half.
- **Prior art:** ~90 component tests exercising panels, overlay, accessibility, and animation classes; pure-function tests for path resolution. Both files keep their approach; fixtures change shape to sections.
- **Deliberately inverted prior assertions:** post-leaf collapse, outside-click collapse, overlay reset-on-close, drill-down/Back icon behavior, and horizontal width growth tests describe retired behavior and are replaced by their opposites.

## Out of Scope

- Persisting Drawer state across full page reloads (localStorage/sessionStorage).
- Syncing expanded Drawers to the URL.
- Arrow-key tree navigation or roving tabindex beyond current tab focus.
- Any new route entries or changes to the Table component.
- Breakpoint changes (md stays the desktop/mobile boundary) or visual restyling beyond the geometry described.

## Further Notes

- This spec operationalizes ADR 0002 (single-panel accordion sidebar), which supersedes ADR 0001; implementers should treat ADR 0001's behavioral claims as historical only.
- Glossary terms are defined in CONTEXT.md: Route, Leaf node, Full path, Level, Route section, Collapsible route, Drawer, AppLayout, Mobile overlay. Use these names in code, comments, and tests.
