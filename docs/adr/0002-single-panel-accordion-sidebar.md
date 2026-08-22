---
status: accepted
supersedes: ADR-0001
---

# Single-panel accordion sidebar navigation

ADR-0001's horizontal multi-panel drawer forced a second interaction model on mobile (drill-down with a Back icon) and made the sidebar widen and push page content as panels opened. We replaced it with a single fixed-width sidebar: clicking a non-leaf Route toggles its children inline beneath it, with any number of Drawers open at once and identical behavior on desktop and mobile. Drawers are purely user-managed — leaf navigation, outside clicks, and closing the mobile overlay no longer collapse anything — except that Drawers along the active route's ancestry auto-expand once on mount so direct URL landings show location. Top-level routes are grouped into purely visual Route sections (`RoutesSection`, optional static label; no label means no heading, empty sections render nothing).

Considered options: keeping drill-down on mobile was rejected because two state machines would model one tree for no user benefit; sibling-exclusive accordions were rejected because "opening closes others" existed only to stop horizontal panels colliding, which vertical nesting makes moot.
