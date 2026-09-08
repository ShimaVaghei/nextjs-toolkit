# Modal component: controlled, viewport-clamped, single-close-channel

## Decision

**The `Modal` component is fully controlled.** The parent owns visibility via an `open` boolean prop; there is neither internal visibility state nor an `isOpen`/`visible` variant. Because it is controlled, the parent already has the power to close it — that is the *parent-closes* story, and no separate API is needed for it.

**There is exactly one close channel: `onClose`.** The Cancel button, an Escape keypress, and a backdrop click all invoke `onClose`; there is no distinct `onCancel` or silent-close variant. The parent decides what "closing" means; the Modal never conceals a dismissal route.

**The Modal renders through `createPortal` to `document.body`, fixed at `inset-0` and `z-50`, over a translucent backdrop that locks body scroll while open.** This mirrors the Table filter popover's existing portal precedent: pages live inside scroll containers, so an inline `fixed` overlay could be clipped or scroll away. The backdrop closes the modal on click (through `onClose`), consistent with the calendar popup's outside-click dismissal.

**`width` and `height` are applied as the panel's literal CSS width and height, but hard-clamped so the modal never exceeds the viewport.** Even an explicit `width: 800` cannot overflow a 375px phone — the panel is capped at `max-width: 100vw` (and likewise `max-height: 100vh`). Sensible default sizing when neither is passed (`w-full max-w-md`, with small-screen inset) covers dialog-only uses without demands a size.

**The footer is configurable but not free-form.** `submitText` (default `"Apply"`, aligned with the Calendar popup's Apply) and `cancelText` (default `"Cancel"`) label the two actions; `hideCancel` collapses to a single-action confirm; `submitDisabled` disables Apply without busy semantics (e.g. for "validation incomplete"); `submitBusy` renders Apply busy + disabled while async work is pending.

**Submit is asynchronous and ends by auto-closing.** `onSubmit` may return a promise; while it is pending the Apply button shows busy and is disabled, and the modal does not close. On resolve the modal closes through `onClose`; on reject it stays open, the button returns to idle, and the caller (still mounted) handles the error itself — there is no error slot or error prop.

**Accessibility is deliberately light (repo parity).** The modal sets `role="dialog"`, `aria-modal`, and `aria-label={title}`, moves focus to the panel on open, closes on Escape, and locks body scroll. It implements **no focus trap** and no focus-return-on-close.

## Why

- **Controlled**: the Field, Table, and AppLayout overlay all derive visibility from parent state; anything else would be a stranger to this codebase and hard to test.
- **Single `onClose`**: one funnel keeps the queue simple — the parent always knows the exact reason state might change, and cancel/backdrop/parent are indistinguishable by design, exactly like the calendar popup where Escape and Cancel are the same act.
- **Viewport clamp over raw sizes**: a "reusable" component cannot be allowed to clip itself; honoring the requested size as a *hard maximum*, with internal content scroll, gives it a size the author asks for while guaranteeing the user can always reach the Apply/Cancel.
- **No focus trap**: a trap is subtle, easy to get wrong, and none of the existing dialogs in this repo implement one. Building it now would introduce a class of tab-handling bugs for behavior nobody has asked for yet. It is recorded as a deliberate future path rather than silently omitted.

## Consequences

- The Modal has no uncontrolled mode and no separate `onCancel`; anyone expecting one must go through `open`/`onClose`.
- A "loading" affordance is expressed by passing `submitBusy` from the caller while it awaits `onSubmit`'s promise; the Modal itself never owns that pending state.
- Because focus is not trapped, keyboard users can tab out of the modal into the background page while it is open — a known, accepted limitation (documented rather than silently hidden).
- The `"Apply"` default deliberately echoes the Calendar popup's Apply; it is a display string, not the Field concept Commit.
- A role="dialog" is shared loosely with the Mobile overlay and Calendar popup, but those are non-modal (`aria-modal="false"` or fullscreen); `Modal` is the one `aria-modal="true"` centered pane — the name picks out that distinction.