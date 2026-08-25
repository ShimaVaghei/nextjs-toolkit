# 15 — Async Options — Pending/Rejected/Retry

Type: task
Status: resolved

## What to build

Let a select Field's Options come from an async loader instead of a static array. The loader form fires on mount and moves the Field through **Pending** → Resolved/Rejected under one shared status contract (built now on select; multi-select consumes it in ticket 17):

- Pending: choosing blocked — control disabled; muted "Loading options…" status line with a pure-Tailwind spinner renders in the persistent hint slot (content swaps, node never unmounts); any current selection stays visible.
- Rejected: "Couldn't load options." beside a small bordered Retry button that re-fires the loader — destructive tone, but deliberately *not* Error styling: no `aria-invalid`, error slot untouched.
- While loading, absence of the current value is expected, not stale — no stale-fallback warn fires during Pending.

Full decisions: the Field spec (`../spec.md`).

Blocked by: 14 — Select kind with static Options.

## Acceptance criteria

- [x] Passing a loader function fires it exactly once on mount; resolved Options render and the control enables
- [x] During Pending the control is disabled, "Loading options…" shows in the hint slot, and any selection remains visible
- [x] On rejection, "Couldn't load options." appears beside a Retry button that re-fires the loader successfully
- [x] Rejected styling is distinct from validation Error styling — no `aria-invalid`, error slot untouched
- [x] No stale-value warn while a load is in flight
- [x] Demo page gains the "Async options" section (select on a loadable source) with a simulate-failure toggle mirroring the server Table demo; async Pending/Resolved/Rejected/Retry pinned by tests; lint and typecheck green

## Comments

Implemented 2026-08-25 in commit 8529f08 — status line left unflipped at the time; recorded resolved while closing ticket 17, which consumed this shared status contract for the multi-select kind.
