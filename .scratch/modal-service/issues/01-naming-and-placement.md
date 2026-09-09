# 01 — Naming & module placement

# 01 — Naming & module placement

Type: grilling
Status: resolved

## Question

What is the feature called, and where does it live? Candidates:

- "Modal service" (user's working name) vs "Modal manager" vs "Modal controller".
- File placement: `components/modal/service/`, `lib/modalService.ts`, or a sibling `components/modal-service/`?
- What terms enter `CONTEXT.md` (the map, host, open function, per-modal open functions)?

Avoid-list in CONTEXT.md forbids "popup/dialog box" for Modal — the service naming must not collide with the existing Modal/ModalConfig/Apply/Cancel terms.

## Answer

**Name: Modal Service** — kept from the original working name. It is genuinely service-like (stateful, imperative, module-level singleton), and the word collides with nothing in the codebase. Rejected: Modal Manager / Modal Controller (no gain, rename churn).

**Placement: `components/modal/service/`**, alongside the existing `Modal` module it builds on:

- `components/modal/service/modalService.ts` — the singleton (`open`, the stack store)
- `components/modal/service/ModalHost.tsx` — the client component in the root layout
- `components/modal/service/defineModal.ts` — the per-modal open factory

**CONTEXT.md vocabulary** (to be added during spec assembly):

- **Modal Service** — the imperative singleton API. _Avoid_: modal manager, modal controller.
- **Modal Host** — the client component mounted once in the root layout that renders the open modals. _Avoid_: portal host, modal root.
- **Open** — the service's `open(component, data, config) → Promise<R | undefined>`. _Avoid_: showDialog, launch.
- **Per-modal open** — a typed function produced by `defineModal` that opens one specific modal. _Avoid_: wrapper, helper.

No collision with existing Modal/ModalConfig/Apply/Cancel terms — Open names the service call, while Apply/Cancel remain the Modal footer actions.


## Question

What is the feature called, and where does it live? Candidates:

- "Modal service" (user's working name) vs "Modal manager" vs "Modal controller".
- File placement: `components/modal/service/`, `lib/modalService.ts`, or a sibling `components/modal-service/`?
- What terms enter `CONTEXT.md` (the map, host, open function, per-modal open functions)?

Avoid-list in CONTEXT.md forbids "popup/dialog box" for Modal — the service naming must not collide with the existing Modal/ModalConfig/Apply/Cancel terms.
