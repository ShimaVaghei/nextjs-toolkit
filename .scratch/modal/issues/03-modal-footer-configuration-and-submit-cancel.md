# 03 — Modal footer configuration and submit/cancel

**What to build:** The Modal's footer is configurable but not free-form. By default it offers an Apply button (text "Apply") and a Cancel button (text "Cancel"). `submitText` and `cancelText` override the labels. `hideCancel` collapses the dialog to a single Apply action. `submitDisabled` disables Apply without busy semantics (for gate-on-validation uses).

**Blocked by:** 01 — Modal scaffolding, controlled rendering, and close

**Status:** done

## Acceptance criteria

- [ ] Default submit label is "Apply"; default cancel label is "Cancel".
- [ ] `submitText` and `cancelText` override the defaults.
- [ ] `hideCancel` removes the Cancel button, leaving a single-action dialog.
- [ ] `submitDisabled` disables the Apply button without a busy state.
- [ ] Clicking Apply invokes `onSubmit` (this ticket wires the handler; async behavior is ticket 04).
- [ ] Tests cover the defaults, custom labels, hidden cancel, and disabled Apply.