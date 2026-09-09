# 02 — Modal sizing, viewport clamping, and default layout

**What to build:** The Modal honors `width` and `height` as its panel's literal CSS width/height, but is hard-clamped to never exceed the viewport (`max-width: 100vw`, `max-height: 100vh`). When neither is passed it falls back to a small-screen-safe default size (~448px wide, inset from the edges). A body whose content overflows scrolls internally while the header and footer stay fixed.

**Blocked by:** 01 — Modal scaffolding, controlled rendering, and close

**Status:** done

## Acceptance criteria

- [ ] `width` is applied to the panel's width and is capped at `max-width: 100vw`.
- [ ] `height` is applied to the panel's height and is capped at `max-height: 100vh`.
- [ ] With no size passed, the panel uses the default small-screen-inset size.
- [ ] Overflowing body content scrolls internally while header and footer remain fixed.
- [ ] Tests cover the width/height application, viewport clamping, and internal scroll region.