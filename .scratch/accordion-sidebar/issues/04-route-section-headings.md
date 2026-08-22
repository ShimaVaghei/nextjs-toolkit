# 04 — Route section headings

**What to build:** Render Route sections as visual groups in the sidebar: a section's optional label appears as static text above its group of Routes — it cannot be focused, clicked, or navigated. A section without a label contributes no heading; an empty section renders nothing. Multiple sections stack vertically and have no effect on Full paths or navigation.

**Blocked by:** 01 — Sectioned route data model.

**Status:** ready-for-agent

- [ ] A labeled section renders its label as static, non-focusable text above its group
- [ ] Clicking a section label does nothing — it is not an interactive element
- [ ] A section without a label renders no heading; only its routes
- [ ] An empty section renders nothing at all
- [ ] Multiple sections stack vertically; Full paths are unaffected by grouping
