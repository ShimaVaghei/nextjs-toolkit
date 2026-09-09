# Map: Modal Service

## Destination

A spec (PRD) at `.scratch/modal-service/spec.md` for an imperative **Modal Service** on top of the existing controlled `Modal` component — a singleton `open(component, data, config) → Promise<R | undefined>` API with a `<ModalHost />` in the root layout, per-modal wrapper functions via a `defineModal` factory, and after-submit / after-close callbacks. The spec is handed off for a later implementation session.

## Notes

- Domain: Next.js App Router + React + Tailwind; existing `Modal` at `components/modal/Modal.tsx` is fully controlled (`ModalConfig` with `open`, single `onClose`, async submit lifecycle: busy → auto-close on resolve, stay-open on reject).
- Consult `CONTEXT.md` Modal terms before writing the spec; new terms introduced by the service must be added there.
- Skills: `/grilling`, `/domain-modeling` for resolving tickets.
- Standing preferences: spec only — no implementation in this effort.

## Decisions so far

- [Destination: spec only](#) — this effort ends with a PRD, no code.
- [Exposure pattern](issues/02-exposure-pattern.md) — module singleton service + `<ModalHost />` mounted once in the root layout.
- [Content contract](issues/03-content-contract.md) — `open` takes a component type; the service injects `data: D` plus the resolve/close channels as props.
- [Cancel semantics](issues/04-cancel-semantics.md) — cancelling resolves the promise with `undefined`; caller checks for absence of a result.
- [After-submit / after-close](issues/05-hooks.md) — callbacks in the config (`onSubmitResult(R)`, `onClosed()`) plus the promise; callbacks are the configured mechanism.
- [Per-modal wrappers](issues/06-define-modal.md) — a `defineModal()` factory produces one typed open function per modal.
- [Stacking](issues/07-stacking.md) — multiple modals may be open simultaneously, rendered in order.
- [SSR & client boundaries](issues/09-ssr-boundaries.md) — singleton gets `"use client"` + `import "client-only"`; root layout stays a server component with a client `<ModalHost />` leaf; stack empty at SSR so hydration is safe; Fast Refresh may reset module state (dev-only).

## Not yet specified

- Wrapper config precedence: how much config `defineModal` pins vs what stays per-call (folded into [10 — Edge cases & teardown](issues/10-edge-cases.md)).

## Out of scope

- Implementing the service (a later session executes the spec).
- Changes to the existing controlled `Modal` beyond what the service integration forces.
