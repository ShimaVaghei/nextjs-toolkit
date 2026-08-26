Type: prototype
Blocked by: 01
Status: resolved

## Question

How should the calendar popup behave? Single vs dual month view, day-cell states (out-of-min/max disabled, today marker, selected/in-range highlighting), the range-picking flow across two clicks including re-picking, closed-face display for picked values, mobile sizing, and Escape/outside-click behavior consistent with the existing Options popup. Produce a cheap interactive artifact to react to via /prototype, applying the checklist from 01.

## Answer

**Variant C wins for all four date kinds**: a draft-with-commit popup — single month grid beside a summary/time pane; every pick edits a draft shown in the pane (nothing touches the Field until **Apply**); **Cancel** and **Escape** discard the draft. The instant-commit Options-popup spirit (variants A/B) was rejected in favour of reviewability.

Recorded during review:

- **Minutes type freely** — any value 0–59 (e.g. 3:17), committed on blur/Enter with clamping; the 5-minute slices were rejected by the human.
- **Styling debt is explicit**: the prototype's styling was broken across all variants; the human required that the winning structure be rebuilt properly against Field.tsx's tokens during implementation — the prototype's look must not leak through.
- **Surfaced open question**: one time-of-day control applied to both ends of a datetime-range felt acceptable but was never decided — split into ticket 07.

Everything else follows the checklist from 01 unchanged: APG keyboard map with roving tabindex (arrows/Home/End/PageUp/PageDown ±month, Shift ±year, Enter/Space pick, Escape close), focus on selected-day-else-today on open and back to the trigger on close, `aria-disabled` bounds that stay reachable but refuse activation, today in the accessible name, live-region range announcements, non-modal disclosure (no `aria-modal`).

Prototype: three variants switchable via `?variant=` on `/field`, captured on branch `research/04-calendar-popup-ux` (commit 52080f8) — kept off the main lineage; implementation rebuilds the winner from scratch.
