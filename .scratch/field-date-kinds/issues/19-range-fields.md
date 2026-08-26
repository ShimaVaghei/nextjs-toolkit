# 19 — DateRangeField & DateTimeRangeField shipped

**What to build:** Complete the set: range picking over the same calendar widget. Users pick in two clicks — first click anchors, second completes; a completion earlier than the anchor swaps ends automatically. Picks behave per the draft-commit popup built in the previous slice. Half-picks stream live through the observer with unset ends as `undefined`; non-required Fields may legitimately hold them, while `required` rejects them as Empty. `min` bounds the whole range via `from`, `max` via `to`. Serialization stays per-end, matching the single of the same family.

DateTimeRangeField alone adds two labeled time controls ("Start time" / "End time") beside the grid, each applying to its own end; picking a date seeds that end's draft time to 00:00 local shown immediately, so Apply always lands complete instants. Closed faces join per-end formatted strings with `" – "`, a half-set range showing the set end followed by a dash. Range two-step picking follows the researched React Aria/USWDS conventions: live-region announcements, composed accessible cell names, selected-state band across in-range cells.

**Blocked by:** 18 (two-step picking extends the widget and reuses its draft-commit interaction).

**Status:** ready-for-agent

- [ ] Two-step anchor/complete picking works; out-of-order completions swap so `from <= to` always holds
- [ ] `setValue` normalizes identically to a user edit, including wholesale instant swaps for same-day inversions
- [ ] Half-picks stream live with unset ends `undefined`; `required` rejects them; fixing the second end clears the Error
- [ ] `min`/`max` reject ranges whose `from`/`to` fall outside bounds
- [ ] DateTimeRangeField shows independent start/end time controls; a fresh date pick displays midnight in its own control immediately
- [ ] Closed faces join with `" – "`; half-set ranges show the set end plus trailing dash
- [ ] Screen readers receive live-region announcements and composed cell names during two-step picking
- [ ] Emitted values serialize per-end following the family rules, fixed-width with seconds
- [ ] Config types and handles type singles as strings and ranges as the shared range value shape
- [ ] Tests cover swapping, half-picks, per-end times, and serialization at the public seam
