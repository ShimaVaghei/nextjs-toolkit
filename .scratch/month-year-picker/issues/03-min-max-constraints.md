# 03 — Min/max constraints on year and month panels

**What to build:** Years and months outside the Field's min/max range appear disabled and are not selectable. Prev/next decade arrows are disabled when further navigation would go entirely outside the allowed range.

**Blocked by:** 02 — Month panel with immediate return

**Status:** ready-for-agent

- [ ] Years outside min/max range render as disabled in the year panel
- [ ] Months outside min/max range render as disabled in the month panel
- [ ] Prev decade arrow is disabled when the earliest displayed year is already at or before the min year
- [ ] Next decade arrow is disabled when the latest displayed year is already at or after the max year
- [ ] Disabled years and months cannot be clicked/selected
- [ ] Tests covering: disabled years with min/max, disabled months with min/max, disabled decade arrows at bounds
