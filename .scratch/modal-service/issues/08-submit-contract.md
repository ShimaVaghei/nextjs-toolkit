# 08 — Submit contract & integration with the existing Modal lifecycle

Type: grilling
Status: open

## Question

What exactly does the modal component's injected submit channel look like, and how does it integrate with the existing `Modal`'s async submit lifecycle (Apply busy → auto-close on resolve, stay-open on reject)?

Sub-questions:

- Does the modal component call `submit(result: R)` which the service wires as `ModalConfig.onSubmit` (returning a promise so the busy/reject behavior is reused)?
- How does rejection surface — does `submit` reject keep the modal open (existing behavior) while cancel resolves `undefined`?
- Exact ordering of `onSubmitResult(R)`, `onClose`, `onClosed()`, and promise settlement.
- Does the content component ever need direct `close()` access (close-without-result), and what does that resolve to?

Blocked by: none
