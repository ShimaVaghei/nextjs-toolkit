# 14 — Filter popover closes on outside click

**What to build:** A filter popover opened from a column header closes when the user clicks anywhere outside it, in addition to the existing Escape-to-close. Clicking a different column's filter trigger closes the currently open popover, so only one popover is ever open at a time. Typing inside the popover's input never dismisses it. Escape still closes the popover and returns focus to its trigger button.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Opening a filter popover and clicking anywhere outside the popover and its trigger button closes it.
- [x] Opening one column's filter popover and clicking another column's filter trigger closes the first (and opens the second).
- [x] Escape still closes the popover and returns focus to its trigger button.
- [x] Typing inside the popover's input does not close it.
- [x] Tests added at the Table component seam covering all of the above.

## Answer

Built in `components/Table.tsx`, TDD at the pre-agreed Table component seam (tests first, red, then green).

The popover's open state was lifted from `FilterControl` into `Table` (`openFilterColumn`), making each filter control fully controlled (`open` / `onOpenChange`) so at most one popover is open at a time — clicking a different column's filter trigger closes the previous one and opens the new one. Each `FilterControl` now wraps its trigger and popover in a single container element and, while open, subscribes a document `pointerdown` listener that closes when the click target falls outside that container. Escape still closes the popover and returns focus to the trigger (`closeAndFocus`); the existing 300ms-debounced server filtering and cross-column AND semantics are unaffected.

Test seam as pre-agreed (component-level, `components/Table.test.tsx`): 4 new tests — a `pointerdown` anywhere outside the popover and its trigger closes it; clicking an already-open column's own trigger toggles it closed; opening one column's popover and clicking another column's trigger (dispatched as `pointerdown` + `click`, the real browser sequence) keeps only one open; typing in the input and `pointerdown` inside the popover never dismiss it. Escape close + focus return is covered by the existing popover test. 60 tests in the file; full suite green apart from one pre-existing unrelated `AppLayout` failure present at HEAD; typecheck clean (only a stale `.next` build artifact); lint 0 errors.