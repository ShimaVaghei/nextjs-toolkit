# 12 — Cancel-path vertical slice: open + Modal Host + root-layout mount

**Status:** ready-for-agent

**What to build:** the first tracer bullet of the Modal Service — `open(SomeModal, data)` works end to end with dismissal only. The service singleton holds the stack and hands each modal component its injected `data` and `close` props; the `<ModalHost />` client component, mounted once in the root layout, renders the open modals in open order and nothing when the stack is empty. Every dismissal path — the Cancel button, Escape, backdrop click, and the injected `close()` — resolves the promise with `undefined` and fires `onClosed()` only. Multiple modals stack with unique ids and persist through navigation.

Spec: `.scratch/modal-service/spec.md` (sections: API surface, Content contract, Promise and callback semantics, Exposure & mounting, Behavior rules).

**Blocked by:** None — can start immediately

- [ ] `open(component, data, config?) → Promise<R | undefined>` exists on the client-side singleton (`"use client"` + `client-only` guard) and accepts a component type plus typed data
- [ ] `<ModalHost />` renders each open modal through the existing controlled `Modal` (the service owns the `open`/`onClose` pair); root layout keeps server-component status with the host as its client leaf
- [ ] Cancel button, Escape, backdrop click, and injected `close()` all resolve the promise with `undefined` and fire `onClosed()` (never `onSubmitResult`)
- [ ] Two concurrent opens stack in order, each with its own promise/config/callbacks
- [ ] Unit tests (vitest + Testing Library) cover dismissal semantics, stacking, and empty-host rendering
