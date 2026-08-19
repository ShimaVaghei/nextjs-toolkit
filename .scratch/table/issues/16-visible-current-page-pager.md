# 16 — Visible current page in the pager

**What to build:** The current page number in the pager is visually distinct from the other page buttons — a filled/inverted neutral style with light and dark variants — while keeping `aria-current="page"` and the existing click behavior. All other page buttons keep their current style.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] The current page button renders with the filled/inverted style in light mode.
- [ ] The current page button renders with the matching style in dark mode.
- [ ] Exactly one page button carries `aria-current="page"`, and it is the styled one.
- [ ] Other page buttons keep their existing style.
- [ ] Tests at the Table component seam assert the style and `aria-current` on the current page button.