# 16 — Visible current page in the pager

**What to build:** The current page number in the pager is visually distinct from the other page buttons — a filled/inverted neutral style with light and dark variants — while keeping `aria-current="page"` and the existing click behavior. All other page buttons keep their current style.

**Blocked by:** None — can start immediately

**Status:** resolved

- [ ] The current page button renders with the filled/inverted style in light mode.
- [ ] The current page button renders with the matching style in dark mode.
- [ ] Exactly one page button carries `aria-current="page"`, and it is the styled one.
- [ ] Other page buttons keep their existing style.
- [ ] Tests at the Table component seam assert the style and `aria-current` on the current page button.

## Answer

The current page button now gets a filled/inverted neutral style via a dedicated `PAGER_CURRENT_BUTTON_CLASS` (light: `bg-neutral-900 text-white border-neutral-900`; dark: `dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100`), composed on the shared `PAGER_BUTTON_BASE_CLASS` exactly when `p === displayPagination.page`. `aria-current="page"` and the existing click behavior are unchanged; all other page buttons keep `PAGER_BUTTON_CLASS`. Two tests added at the Table seam (`components/Table.test.tsx`): the current page button carries `aria-current="page"` and the filled light/dark classes while other pager buttons don't, and the style follows the user as they navigate. Table suite 66 green; full suite 150 green + the one pre-existing `AppLayout` failure.