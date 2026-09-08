# 04 — Modal async submit lifecycle

**What to build:** Apply runs `onSubmit`, which may return a promise. While that promise is pending, the Apply button shows a busy state and is disabled, and the modal stays open. On resolve, the modal auto-closes via `onClose`. On reject, the modal stays open and Apply returns to idle so the caller itself handles the failure (no error slot).

**Blocked by:** 03 — Modal footer configuration and submit/cancel

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Pending submit: Apply is disabled + busy and the modal does not close.
- [ ] On resolve of `onSubmit`, the modal calls `onClose` (auto-close).
- [ ] On reject of `onSubmit`, the modal stays open and Apply returns to enabled.
- [ ] The caller's handling of failure is not obstructed (no modal-owned error surface).
- [ ] Tests cover pending/busy, resolve-close, and reject-stays-open.