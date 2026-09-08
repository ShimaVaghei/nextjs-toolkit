# 05 — Modal demo page and nav route

**What to build:** A live demo page that exercises every Modal behavior — open/close, Cancel, Escape, backdrop-click, custom labels, hidden cancel, disabled Apply, async (busy + resolve + reject) submit, and sized and default dialogs — reachable from the in-app navigation so a person can click through it in the browser.

**Blocked by:** 03 — Modal footer configuration and submit/cancel, 04 — Modal async submit lifecycle

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A demo page exists and is wired into the navigation as a reachable route.
- [ ] The demo exercises the default and custom-label footer, hidden cancel, and disabled Apply.
- [ ] The demo exercises async submit in its busy, resolve, and reject states.
- [ ] The demo exercises sized (width/height) and default-sized dialogs, including viewport clamping.
- [ ] The demo is reachable from the app's navigation (mirrors the Table/Field demo pages).