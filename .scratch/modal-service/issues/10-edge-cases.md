# 10 — Edge cases & teardown

Type: grilling
Status: resolved

## Question

Which edge cases must the spec pin down?

Candidates:

- A modal is open when its caller unmounts / navigates: does the promise settle (resolve undefined) or leak?
- StrictMode double-invoke of effects with the singleton store.
- Two `defineModal` opens of the same modal concurrently.
- Config precedence in wrappers: definition-time config vs per-call config overrides.
- What the spec requires as demo page / unit test coverage (consistent with existing Modal demo + `__tests__` conventions).

Blocked by: 08

## Answer

**Rules adopted as proposed:**

1. **Caller unmount / navigation.** The Modal Host lives in the root layout, so modals persist through navigation — they close only when resolved. Every `open()` promise always settles; a caller that unmounts while awaiting simply has its continuation run harmlessly (React 18 no-ops state updates on unmounted components). The service never leaks a pending promise per open.
2. **StrictMode.** The singleton store is plain module state; effect re-runs never touch it. Spec rule: *call `open()` from event handlers, never from render or effects* — the same discipline the existing demos follow. No defensive service code required.
3. **Concurrent opens of the same modal.** Allowed. Each `open()` entry carries a unique id; each instance has its own promise, config, and callbacks. Two calls to the same per-modal open stack two independent instances.
4. **Wrapper config precedence.** `defineModal(Comp, definitionConfig)` shallow-merges with the per-call config; **per-call wins** on key conflicts, so pinned defaults (title, size, texts) remain overridable per invocation.

**Demo & test expectations** (consistent with repo conventions — vitest + Testing Library `__tests__` beside components; manual demo pages under `app/`):

- Unit tests in `components/modal/service/__tests__/` covering the service (`modalService`, `defineModal`) and Modal Host rendering: submit-resolve path, async submit busy/reject path, cancel/close semantics, callback and promise ordering, stacking.
- A **"Modal service" section added to the existing `app/modal` demo page** — no new page or route.


## Question

Which edge cases must the spec pin down?

Candidates:

- A modal is open when its caller unmounts / navigates: does the promise settle (resolve undefined) or leak?
- StrictMode double-invoke of effects with the singleton store.
- Two `defineModal` opens of the same modal concurrently.
- Config precedence in wrappers: definition-time config vs per-call config overrides.
- What the spec requires as demo page / unit test coverage (consistent with existing Modal demo + `__tests__` conventions).

Blocked by: 08
