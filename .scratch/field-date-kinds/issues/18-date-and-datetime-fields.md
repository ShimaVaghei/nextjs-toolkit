# 18 — Calendar widget rebuilt + DateField & DateTimeField shipped

**What to build:** The first user-visible vertical path: an app developer drops a DateField or DateTimeField into a form and their users pick dates in a real calendar. The reusable internal calendar widget is rebuilt from scratch against the Field's own design tokens — the prototype's broken styling does not survive — carrying the draft-with-commit interaction (picks edit a pane-shown draft; Apply lands it; Cancel/Escape discards; single month grid beside the summary/time pane; minutes type freely 0–59, committed on blur/Enter with clamping) and the full APG accessibility map (roving tabindex grid, arrows/PageUp/Home/End/Esc, focus on selected-day-else-today on open and back to trigger on close, `aria-disabled` out-of-bounds days that stay reachable, polite live month heading, non-modal disclosure).

On top of it ship the first two wrappers and their non-generic config types with full presentation parity — `placeholder` rendering only as the closed trigger face's ghost text while Empty — wired through the engine's serialization split and validators, tested at the public component seam.

**Blocked by:** 17 (wrappers stamp the new engine kinds onto the value model).

**Status:** ready-for-agent

- [ ] DateField and DateTimeField each render one labeled control with hint/disabled/className parity; placeholder appears only on the closed face
- [ ] Closed face shows the en-US Intl-formatted value when filled, placeholder ghost when Empty
- [ ] Popup follows Variant C: draft edits in the pane, Apply commits, Cancel/Escape discards; Escape/outside-click behavior consistent with the existing Options popup spirit
- [ ] Full APG keyboard map works end-to-end, including focus placement on open/close and month paging
- [ ] Minutes type freely (any 0–59) with blur/Enter commit and clamping
- [ ] `date` emits fixed-zero UTC-midnight strings; `datetime` emits the real UTC instant from browser-local wall-clock; both fixed-width with seconds
- [ ] `required`, `min`, `max` validate per the settled rules; Errors appear once Touched, clear immediately on fix, and force-run via `validate()`
- [ ] Invalid `Initial` seeds nothing with a dev-only warning naming the Field
- [ ] Widget styling uses the Field tokens throughout — no prototype CSS remains
- [ ] Tests drive real user events against the public components and assert only observable behavior
