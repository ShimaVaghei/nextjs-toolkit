# 04 — Seed routes and mount the shell in the root layout

**What to build:** A seeded route config module provides the app's placeholder Routes, and the root layout renders `AppLayout` with them, wrapping every page in the app. Running the app shows the completed shell: navigation plus content on the homepage, the sticky desktop layout, and the hamburger-driven mobile overlay.

**Blocked by:** 03 — Mobile: top bar, hamburger, fullscreen overlay

**Status:** done

- [x] Seeded route config module exists with placeholder Routes
- [x] Root layout renders `AppLayout` with the seeded Routes, wrapping all page content
- [x] Running the app shows the navigation shell on the homepage; desktop push and mobile overlay both work
- [x] Empty-routes handling retained (layout renders gracefully with no Routes)
