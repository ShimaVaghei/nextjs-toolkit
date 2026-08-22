# 01 — Sectioned route data model

**What to build:** Introduce the Route section shape — an optional label plus a list of Routes — exported alongside `Route` so consumers import both from the AppLayout module. Reseed the navigation data by wrapping today's routes in a single label-less section. Make the layout component and the active-route computation accept the sectioned input, walking every section transparently so Full paths come out byte-for-byte identical to today. The user-visible sidebar must render pixel-identically after this ticket — it exists purely to make the accordion change easy.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Navigation seed data is a list of Route sections, wrapping today's routes in one section without a label
- [x] The layout component accepts the sectioned shape and renders exactly the same sidebar as before this change
- [x] Active-route resolution walks all sections transparently; Full paths and highlight behavior are unchanged
- [x] Both existing test files use sectioned fixtures and the full suite passes green

## Comments

Implemented on branch `sidebar`. `RoutesSection` (optional `label`, required `routes`) is exported alongside `Route` from the AppLayout module; `computeActiveRoute` walks each section in order, and AppLayout flattens sections for rendering so the DOM is byte-for-byte identical to the pre-section sidebar. Seed wraps Home + Table in one label-less section. Also fixed a pre-existing stale seed test that expected Dashboard/Settings/Users fixtures. Full suite: 181 passed.
