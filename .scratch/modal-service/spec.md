# Modal Service — Spec

The imperative layer on top of the existing controlled `Modal` component: open modals from anywhere with a typed `open()` call, await the submitted result as a promise, and declare per-modal open functions with full type inference. Decisions live in `.scratch/modal-service/issues/` (02–07, 01, 08, 09, 10); this spec is the destination artifact for the implementation session.

## API surface

New module: `components/modal/service/`, three files:

```ts
// modalService.ts — the singleton ("use client", plus `import "client-only"`)
type ServiceModalConfig = {
  // ModalConfig minus `open` and `onClose` (the service owns visibility and
  // the close channel): title, width, height, submitText, cancelText,
  // hideCancel, submitDisabled.
  onSubmitResult?: (result: unknown) => void;
  onClosed?: () => void;
};

// The generic open call.
open<D, R>(
  component: ComponentType<ServiceModalProps<D, R>>,
  data: D,
  config?: ServiceModalConfig,
): Promise<R | undefined>;

// ModalHost.tsx — client component, mounted once in the root layout
export function ModalHost(): JSX.Element;

// defineModal.ts — the per-modal open factory
defineModal<D, R>(
  component: ComponentType<ServiceModalProps<D, R>>,
  definitionConfig?: ServiceModalConfig,
): (data: D, config?: ServiceModalConfig) => Promise<R | undefined>;
```

The exact shape of `ServiceModalProps`, `ServiceModalConfig`, and how they relate to the existing `ModalConfig` (e.g. whether `ServiceModalConfig` extends a pick of it) is the implementer's call, constrained by the behavior below.

## Content contract

A service modal is a component whose props the service types and injects:

```ts
type ServiceModalProps<D, R> = {
  data: D;                                   // the modal data from open()
  submit: (result: R | Promise<R>) => void;  // possibly-async submission
  close: () => void;                         // close without a result
};
```

`open` takes the **component type**, not an element: `open(ConfirmModal, data, config)` renders `<ConfirmModal data={data} submit={...} close={...}/>`. Typing flows from the component's props, so `open`/`defineModal` are generic over `<D, R>` with full inference and no manual annotations.

## Integration with the existing Modal

- The service renders each stack entry through the existing `Modal` (`components/modal/Modal.tsx`).
- `submit` is wired into `ModalConfig.onSubmit`, reusing the existing async submit lifecycle untouched:
  - Plain `R`: resolves and closes immediately.
  - `Promise<R>`: Apply goes busy + disabled; the modal stays open until the promise settles.
  - Resolve: modal closes; `open()` resolves with `R`.
  - Reject: modal **stays open**, Apply returns to idle; the service fires nothing — the content component handles its own failure.
- The service owns `open`/`onClose` in the `ModalConfig`; callers never pass them.

## Promise and callback semantics

`open(...)` always returns `Promise<R | undefined>` and **always settles** — the service never leaks a pending promise per open.

Event ordering:

- **Submit resolves:** `onSubmitResult(R)` → modal removed from the stack → `onClosed()` → promise resolves with `R`. Callbacks precede the promise so an awaiting caller observes a fully-torn-down modal.
- **Cancel / `close()`:** no `onSubmitResult` → `onClosed()` → promise resolves with `undefined`. Cancel covers every dismiss path: the Cancel button, Escape, backdrop click, and the injected `close()` — programmatic early exit is exactly symmetric with user dismissal.
- **Submitted promise rejects:** nothing fires; the modal stays open.

## Exposure & mounting

- **Module singleton** (`modalService.ts`): `open()` is callable from anywhere, non-React code included. The module is `"use client"` **and** `import "client-only"`, so importing it from a server component fails at build time, not confusingly at runtime.
- **`<ModalHost />`** mounted once in the root layout, which stays a server component (client-component-at-the-leaves pattern). The host renders nothing when the stack is empty, so SSR output and hydration match — the stack is always empty at SSR.
- Dev-only caveat to document in a code comment: Fast Refresh may reset module-level state; keep the store trivially re-initializable.

## Behavior rules

- **Stacking:** multiple modals may be open simultaneously; the host renders them in open order, later ones visually on top (z-index ordering by stack position). Each open has its own promise, config, and callbacks. Two calls to the same per-modal open stack two independent instances (unique entry ids).
- **Persistence:** the host lives above routing, so modals persist through navigation; they close only when resolved. A caller that unmounts while awaiting has its continuation run harmlessly (React 18 no-ops updates on unmounted components).
- **StrictMode:** the singleton store is plain module state; no defensive code. Spec rule for consumers: *call `open()` from event handlers, never from render or effects*.
- **Wrapper config precedence:** `defineModal` shallow-merges its `definitionConfig` with the per-call config; **per-call wins** on key conflicts, so pinned defaults (title, size, labels) stay overridable per invocation.

## Definition of done

- Implementation of the three files above, reusing `Modal` unchanged unless integration forces a change.
- Unit tests in `components/modal/service/__tests__/` (vitest + Testing Library, repo conventions) covering: the submit-resolve path, the async busy/reject path, cancel and `close()` semantics, callback/promise ordering, stacking, and per-call config precedence.
- A **"Modal service" section on the existing `app/modal` demo page** (no new page or route), exercising a resolved submit, a failed submit, and a cancel.
- The Modal Service terms present in `CONTEXT.md` (added during spec assembly, below).
