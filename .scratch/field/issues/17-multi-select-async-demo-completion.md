# 17 — Multi-select async parity + demo completion

Type: task
Status: resolved

## What to build

Wire the shared async contract (ticket 15) into the multi-select kind: loader form accepted for its Options, firing on mount; Pending disables the control with "Loading options…" while selections stay visible as Chips; Rejected offers Retry; the popup interior itself never shows loading states — it only opens once options are resolved.

Then finish the demo page: a section for every Field kind plus the completed "Async options" section covering both choice kinds on loadable sources with a simulate-failure toggle, mirroring the server Table demo's error simulation. Final sweep: every tone holds in light and dark modes, the whole ten-item minimum contract passes, and any term coined along the way has landed in `CONTEXT.md`.

Full decisions: the Field spec (`../spec.md`).

Blocked by: 15 — Async Options — Pending/Rejected/Retry; 16 — Multi-select popup — Chips, search, focus choreography.

## Acceptance criteria

- [x] Multi-select accepts a loader; mount fires it; Pending/Resolved/Rejected follow the shared status contract with selections visible throughout
- [x] Popup refuses to open while unresolved (Pending or Rejected); after resolution it works normally
- [x] Retry re-fires the loader and recovers the multi-select to usable
- [x] Demo page carries a section per Field kind plus a finished Async options section (select + multi-select) with simulate-failure toggle
- [x] Full minimum vitest contract green — coercion matrix, Touched lifecycle, async both kinds, force-run validate, multi-select toggles, dev-warns, stale fallback, ghost option, keepDisabledSelection, a11y floor
- [x] Dark-mode check across all statuses and tones; lint and typecheck green; glossary updated if anything was coined

## Comments

Implemented 2026-08-25 on branch `field`. The multi-select already consumed the ticket-15 shared machinery (`multiDisabled`, hint-slot statuses, fallback chips while unresolved); this ticket pinned the contract at the public seam in `components/Field.test.tsx` ("Field multi-select async options": mount fires once, Pending disables open button + chip removes while the held value shows as its raw-value chip and upgrades to its label on resolve, popup refuses to open through Pending *and* Rejected, Retry re-fires and recovers to fully usable, and the persistent hint slot swaps status without unmounting) and hardened `toggleOpen` with an explicit unresolved guard so "opens only once resolved" holds independent of the disabled button. Demo `/field` Async options section now covers both choice kinds (Region select + Teams multi-select, the multi-select preselecting a to-be-resolved value) behind one shared simulate-failure toggle mirroring the server Table demo; input and textarea got their own sections so every Field kind has one.

Code-review follow-ups applied: multi-select async tests pin the never-unmounted hint node; demo loaders collapsed into one `simulateOptionLoad` factory; "a section per Field kind" satisfied literally; glossary-strict "while Pending" wording in demo copy.

No new terms coined — Pending/Rejected/Option/Chip covered in `CONTEXT.md`; glossary untouched. Full suite 242 green; lint/typecheck clean; production build prerenders `/field`.
