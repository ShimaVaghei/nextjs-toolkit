# 04 — Cancel semantics

Type: grilling
Status: resolved

## Question

When the modal is cancelled (Cancel button, Escape, backdrop), what happens to the promise returned by `open`?

## Answer

**Resolve with `undefined`** (caller checks for absence of a result): `open(...) → Promise<R | undefined>`.

- Every dismiss path (Cancel, Escape, backdrop) funnels through the same resolve-with-undefined behavior, mirroring the existing Modal's single `onClose` channel.
- Rejected: rejecting on cancel (forces try/catch on every call) and never-settling promises (leaks a pending promise per cancelled open).
