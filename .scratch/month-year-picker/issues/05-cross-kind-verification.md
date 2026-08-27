# 05 — Cross-kind verification

**What to build:** The month/year picker works identically for DateTimeField, DateRangeField, and DateTimeRangeField. The overlay flow, decade navigation, month selection, min/max constraints, and keyboard behavior are consistent across all four date kinds.

**Blocked by:** 02 — Month panel with immediate return, 03 — Min/max constraints on year and month panels, 04 — Keyboard accessibility for year and month panels

**Status:** ready-for-agent

- [ ] DateTimeField: header click opens year panel, full flow through month selection returns to day grid
- [ ] DateRangeField: header click opens year panel, full flow through month selection returns to day grid
- [ ] DateTimeRangeField: header click opens year panel, full flow through month selection returns to day grid
- [ ] Min/max constraints work correctly for all four date kinds
- [ ] Keyboard navigation works correctly for all four date kinds
- [ ] Tests for each date kind covering the full overlay flow
