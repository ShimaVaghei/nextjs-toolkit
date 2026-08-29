# 03 — Extract the Calendar popup as a deep module

Status: ready-for-agent
Blocked by: 01, 02
Spec: `../spec.md` (see "Calendar popup module (step 1)" under Implementation Decisions)

## Task

Extract the Calendar popup (~lines 1000–1858 of `components/Field.tsx`) plus its draft/range/time-driving state from Field into a new `components/calendar/` module. `CalendarPopup.tsx` is the only public interface; private siblings allowed only for genuinely self-contained pieces (the Month/year picker overlay qualifies — it already has its own tests and manages its own two-step flow). ADR-0001's stacked UX is untouched; only ownership moves.

## Interface (8 entries, down from 32)

```
kind            // "date" | "datetime" | "date-range" | "datetime-range"
value           // current Field value; seeds the draft on open
min?, max?
triggerRef      // focus return + placement measurement
open, onClose   // disclosure control; Cancel and Escape both map to onClose
onCommit        // raw draft value; Field normalizes
```

## Ownership after the move

- **Popup owns:** the Draft (seeded from `value` on open, discarded internally), range anchoring and two-step pick, hover-range preview, time slices, outside click, Escape, focus return, and placement measurement/flip.
- **Field owns:** normalization (`normalizeDateInput` from the date module), the observer + Error re-evaluation pipeline on commit (identical to a user edit), the trigger button, and `open` state.
- Cancel and Escape are indistinguishable to Field — both map to `onClose`; discard is internal.
- Per commit `72106fe`: close is not automatic on pick; the popup stays open after range completion. That policy lives inside the popup.

## Steps

1. Create `components/calendar/CalendarPopup.tsx` (and `YearMonthOverlay.tsx` as a private sibling) with the interface above; move the day grid, time inputs, and disclosure mechanics in.
2. Delete the 32-prop wiring from Field: draft slices, anchor, hover, time halves, `onCancelRef`, `onCalendarMouseDown/Up`, extra refs. Field keeps exactly one ref to pass (the trigger).
3. Rewire Field's Apply path: `onCommit(rawDraft)` → `normalizeDateInput` → existing observer/Error pipeline.
4. Move/adjust popup behavior tests to exercise the module's public interface (seed → pick → commit/cancel flows for all four kinds; disclosure behavior). Keep the overlay's existing tests passing; port them to the new location.
5. Run `pnpm test`, `pnpm lint`, `npx tsc --noEmit`, and manually smoke the date field demo page (`pnpm dev` → field demo) for all four kinds.

## Acceptance

- `components/Field.tsx` no longer contains the popup or any draft/range/time state; expected to land near ~2,000 lines.
- The module's public interface is exactly the 8 entries above; nothing else importable from `components/calendar/`.
- All popup regression classes covered by tests through the public interface: time reset (`26f306c`), end-time removal (`4bd5bc8`), placement (`3e2e752`), keep-open-after-range (`72106fe`), click-outside (`28ab989`, `004b6bc`).
- Full suite green; no user-visible behavior change.
