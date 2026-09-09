# 02 — Exposure pattern

Type: grilling
Status: resolved

## Question

How is the modal service exposed to callers: context provider + hook, module-level singleton, or host component with a ref handle?

## Answer

**Module singleton service + `<ModalHost />` mounted once in the root layout.**

- `open(...)` is callable from anywhere (non-React code included) via the module singleton.
- React rendering stays idiomatic: the `ModalHost` owns the stack state and renders the open modals through the existing portaled `Modal` component.
- Fits the repo's "host in root layout" pattern (AppLayout is already mounted there).
- Rejected: pure context/hook (open() unreachable outside the provider tree) and service-renders-itself (no clean React integration point).
