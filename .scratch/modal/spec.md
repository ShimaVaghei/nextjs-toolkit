# Modal — reusable, controlled dialog

**Status:** `ready-for-agent`

## Problem Statement

The project has no centered-dialog component. Today the only `role="dialog"` uses are the non-modal, fullscreen **Mobile overlay** (AppLayout) and the standalone **Calendar popup** — neither is a reusable pane that blocks the rest of the page while a user confirms an action. Building one from scratch each time would duplicate the same portal, backdrop, scroll-lock, Escape handling, and footer wiring across pages.

## Solution

A reusable, fully controlled **Modal** component. The parent owns visibility through an `open` flag and every dismissal path — the Cancel button, an Escape keypress, a backdrop click, or the parent itself — funnels through the single `onClose` callback. It renders portaled over the page, locks body scroll, and clamps itself to the viewport so it never overflows. Its footer offers an Apply action (which may run asynchronously and auto-close on resolve) and a Cancel action, both configurable.

## User Stories

1. As a page developer, I want to show a Modal whenever I set its `open` prop to `true`, so that I can surface a confirmation or form dialog on demand.
2. As a page developer, I want the Modal to vanish from the DOM when `open` is `false`, so that a closed modal takes up no space or accessibility surface.
3. As a page developer, I want to pass a `title` that becomes both the visible heading and the dialog's `aria-label`, so that the dialog is named for assistive tech without extra props.
4. As a page developer, I want arbitrary `children` as the body, so that any form or content can live inside the dialog.
5. As a page developer, I want to close the Modal from my own code by flipping `open` to `false`, so that the parent always has full control over dismissal (parent-closes path).
6. As a user, I want to dismiss the Modal by clicking **Cancel**, so that I can abandon the dialog without committing anything.
7. As a user, I want to dismiss the Modal by pressing **Escape**, so that keyboard users can close it like the existing overlays.
8. As a user, I want to dismiss the Modal by clicking the backdrop outside the panel, so that I can close it without hunting for a button.
9. As a page owner, I want Cancel / Escape / backdrop-click to all call the same `onClose`, so that closing is a single, predictable channel I can rely on.
10. As a user, I want the Apply button to confirm the dialog and close it, so that my action completes the flow.
11. As a page owner, I want `onSubmit` to be able to return a promise, so that I can run asynchronous work before the dialog closes.
12. As a user, I want the Apply button to show a busy state and stay disabled while async work is pending, so that I never accidentally double-submit.
13. As a page owner, I want the Modal to close itself only when `onSubmit`'s promise resolves, so that it does not close before async work finishes.
14. As a page owner, I want the Modal to stay open with Apply returned to idle when `onSubmit` rejects, so that I can handle the failure myself (the caller is still mounted).
15. As a page owner, I want to pass custom submit and cancel button text, so that the labels fit my domain (defaults are "Apply" and "Cancel").
16. As a page owner, I want to hide the Cancel button, so that a single-action confirm dialog is expressible.
17. As a page owner, I want to disable Apply without busy semantics, so that I can gate it on unmet validation (e.g. an incomplete form).
18. As a page owner, I want to pass a `width` and `height` that the panel honors, so that I can size it as needed.
19. As a user, I want the Modal to never exceed the viewport even when the requested size is large, so that I can always reach the Apply/Cancel buttons.
20. As a user, I want a default resting size (a few hundred px, inset on small screens) when no size is passed, so that a dialog-only usage looks right without configuration.
21. As a user, I want the body (children) of a tall Modal to scroll internally while the header and footer stay fixed, so that the title and buttons remain reachable.
22. As a page owner, I want a delivered demo page wired into the navigation, so I can see and exercise every Modal behavior in-browser.

## Implementation Decisions

- **Controlled component.** The `Modal` holds no internal visibility state. The parent passes `open: boolean` and `onClose: () => void`; flipping `open` off is how the parent closes it. This matches the repo's existing Field/Table/AppLayout-overlay pattern of parent-derived visibility.
- **Single close channel.** Cancel button, Escape keypress, and backdrop click are not separate callbacks — all invoke `onClose`. There is deliberately no `onCancel` or silent-close variant. "Parent-closes" requires no extra API because controlled mode already provides it.
- **Portaled rendering.** Rendered via `createPortal` to `document.body`, `fixed inset-0`, high z-index, over a translucent backdrop, with body scroll locked while open. This mirrors Table's existing portal precedent: pages live inside scroll containers, so an inline `fixed` overlay could clip or scroll away.
- **Viewport clamping.** `width: string` and `height: string` are applied as the panel's literal CSS `width`/`height`, but hard-clamped with `max-width: 100vw` / `max-height: 100vh` so the modal never exceeds the viewport on any screen.
- **Default sizing.** When neither `width` nor `height` is passed, the panel uses a sensible default (`w-full max-w-md` ≈ 448px) with small-screen inset so it never touches the edges.
- **Internal scroll.** Sticky header (title) and sticky footer (actions); only the `children` body scrolls internally (the repo's `thin-scrollbar` treatment).
- **Footer contract.** `submitText` (default `"Apply"`) and `cancelText` (default `"Cancel"`); `hideCancel: boolean` collapses to a single-action dialog; `submitDisabled: boolean` disables Apply without busy semantics; `submitBusy: boolean` renders Apply busy + disabled while async work is pending.
- **Async submit lifecycle.** `onSubmit(): void | Promise<unknown>`. While a returned promise is pending → Apply is busy + disabled and the modal does not close. On **resolve** → the Modal calls `onClose` (auto-close). On **reject** → the modal stays open, Apply returns to idle, and the caller handles the error itself; there is no error prop or error slot.
- **Named prop choices.** `submitBusy` + `submitDisabled` (not `isSubmitting` / `canSubmit`).
- **Light accessibility (repo parity).** `role="dialog"`, `aria-modal`, `aria-label={title}`, focus moves to the panel on open, Escape closes, body scroll is locked. **No focus trap and no focus-return-on-close** — a deliberate, documented limitation consistent with the existing dialogs in this repo.

## Deliverables

- `components/modal/Modal.tsx` + `components/modal/index.ts` (module re-export)
- `components/modal/__tests__/Modal.test.tsx`
- Demo page: `app/modal/page.tsx` + wiring into `lib/routes.ts` as a reachable AppLayout route

## Testing Decisions

- **Test only external behavior**, never implementation details — assert what renders (roles, labels, disabled/busy states) and which callbacks fire.
- **Single seam: the Modal component through its props.** Use a small harness component owning the `open` flag plus spies for `onClose`/`onSubmit`, mirroring the `PopupHarness` in `CalendarPopup.test.tsx` and the `makeConfig()`/render helpers in `Table.test.tsx`. Tests run in vitest `jsdom` (`npm test` / `pnpm test`).
- **Cover the contract**:
  - renders `role="dialog"`, `aria-modal`, `aria-label={title}` when open; renders nothing when closed.
  - Cancel button, Escape key, and backdrop click each call `onClose`.
  - parent-closes path: test toggles `open` off and asserts the portal content unmounts.
  - async submit: pending → Apply disabled + busy; resolve → auto-close; reject → stays open, Apply re-enabled.
  - default labels, `hideCancel`, `submitDisabled`, `submitBusy`.
  - width/height applied with viewport clamp; internal children scroll; default small-screen size.
- **Demo page is a manual seam only** — not unit-tested, consistent with the existing `app/field` and `app/table` demos.

## Out of Scope

- A focus trap and focus-return-on-close (recorded limitation in ADR-0003; a candidate future ADR).
- Uncontrolled mode or a separate `onCancel` channel.
- An error slot / error-prop for failed submissions (the caller handles failures).
- Animated open/close transitions.
- Confirm-style "danger" variants (danger/primary color theming).
- Native `<dialog>` element usage.

## Further Notes

- ADR-0003 (Modal component: controlled, viewport-clamped, single-close-channel) captures the rationale and consequences; the glossary in `CONTEXT.md` defines **Modal**, **Apply** (default submit label, echoing the Calendar popup's Apply), and **Cancel**.
- The "Apply" default aligns with the Calendar popup's Apply shorthand; it is display text, not the Field concept Commit.
- The Modal's `role="dialog"` is shared loosely with the Mobile overlay and Calendar popup, but those are non-modal; Modal is the one `aria-modal="true"` centered pane.