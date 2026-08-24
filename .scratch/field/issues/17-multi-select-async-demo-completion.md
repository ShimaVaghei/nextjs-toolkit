# 17 — Multi-select async parity + demo completion

Type: task
Status: ready-for-agent

## What to build

Wire the shared async contract (ticket 15) into the multi-select kind: loader form accepted for its Options, firing on mount; Pending disables the control with "Loading options…" while selections stay visible as Chips; Rejected offers Retry; the popup interior itself never shows loading states — it only opens once options are resolved.

Then finish the demo page: a section for every Field kind plus the completed "Async options" section covering both choice kinds on loadable sources with a simulate-failure toggle, mirroring the server Table demo's error simulation. Final sweep: every tone holds in light and dark modes, the whole ten-item minimum contract passes, and any term coined along the way has landed in `CONTEXT.md`.

Full decisions: the Field spec (`../spec.md`).

Blocked by: 15 — Async Options — Pending/Rejected/Retry; 16 — Multi-select popup — Chips, search, focus choreography.

## Acceptance criteria

- [ ] Multi-select accepts a loader; mount fires it; Pending/Resolved/Rejected follow the shared status contract with selections visible throughout
- [ ] Popup refuses to open while unresolved (Pending or Rejected); after resolution it works normally
- [ ] Retry re-fires the loader and recovers the multi-select to usable
- [ ] Demo page carries a section per Field kind plus a finished Async options section (select + multi-select) with simulate-failure toggle
- [ ] Full minimum vitest contract green — coercion matrix, Touched lifecycle, async both kinds, force-run validate, multi-select toggles, dev-warns, stale fallback, ghost option, keepDisabledSelection, a11y floor
- [ ] Dark-mode check across all statuses and tones; lint and typecheck green; glossary updated if anything was coined
