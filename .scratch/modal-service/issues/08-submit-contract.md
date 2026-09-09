# 08 — Submit contract & integration with the existing Modal lifecycle

Type: grilling
Status: resolved

## Question

What exactly does the modal component's injected submit channel look like, and how does it integrate with the existing `Modal`'s async submit lifecycle (Apply busy → auto-close on resolve, stay-open on reject)?

Sub-questions:

- Does the modal component call `submit(result: R)` which the service wires as `ModalConfig.onSubmit` (returning a promise so the busy/reject behavior is reused)?
- How does rejection surface — does `submit` reject keep the modal open (existing behavior) while cancel resolves `undefined`?
- Exact ordering of `onSubmitResult(R)`, `onClose`, `onClosed()`, and promise settlement.
- Does the content component ever need direct `close()` access (close-without-result), and what does that resolve to?

Blocked by: none

## Answer

**Injected props.** A service modal is a component whose props the service types and injects:

```ts
type ServiceModalProps<D, R> = {
  data: D;                       // the modal data passed to open()
  submit: (result: R | Promise<R>) => void;  // submit a result (possibly async)
  close: () => void;             // close without a result
};
```

**Submit semantics — async-aware.** `submit(result | Promise<R>)` is wired by the service into `ModalConfig.onSubmit`, so the existing Modal lifecycle is reused unchanged:

- A plain `R` resolves `open()` with `R` and closes immediately.
- A `Promise<R>` puts Apply into its busy state; the modal stays open until the promise settles.
- On resolve: `open()` resolves with `R` and the modal closes.
- On reject: the modal **stays open**, Apply returns to idle — the service fires nothing; the content component handles its own failure (existing Modal behavior).

**Cancel semantics** (per ticket 04): Cancel button, Escape, backdrop — and the injected `close()` — resolve `open()` with `undefined`.

**Event ordering** (adopted as proposed):

- Submit resolves: `onSubmitResult(R)` → modal removed from the stack → `onClosed()` → `open()` promise resolves with `R`. Callbacks precede the promise so an awaiting caller observes a fully-torn-down modal.
- Cancel / `close()`: no `onSubmitResult` → `onClosed()` → promise resolves with `undefined`.
- Submitted promise rejects: nothing fires; the modal stays open.

**Close-without-result — yes.** The content component also receives `close()`; it follows cancel semantics exactly (promise resolves `undefined`, `onClosed()` fires, no `onSubmitResult`), so programmatic early exit is symmetric with user dismissal.


## Question

What exactly does the modal component's injected submit channel look like, and how does it integrate with the existing `Modal`'s async submit lifecycle (Apply busy → auto-close on resolve, stay-open on reject)?

Sub-questions:

- Does the modal component call `submit(result: R)` which the service wires as `ModalConfig.onSubmit` (returning a promise so the busy/reject behavior is reused)?
- How does rejection surface — does `submit` reject keep the modal open (existing behavior) while cancel resolves `undefined`?
- Exact ordering of `onSubmitResult(R)`, `onClose`, `onClosed()`, and promise settlement.
- Does the content component ever need direct `close()` access (close-without-result), and what does that resolve to?

Blocked by: none
