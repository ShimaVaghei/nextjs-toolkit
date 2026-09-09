# 11 — Assemble the spec (PRD)

Type: task
Status: resolved

## Question

Assemble `.scratch/modal-service/spec.md` from all resolved tickets: the API (`open`, `defineModal`, `ModalHost`, config with `onSubmitResult`/`onClosed`), the `<D, R>` typing story, stacking behavior, edge-case rules, and the demo/test expectations. Add the new terms to `CONTEXT.md` (per the naming ticket). This is the destination artifact handed to the implementation session.

Blocked by: 01, 08, 09, 10

## Answer

**Done.** `spec.md` written at `.scratch/modal-service/spec.md`, covering: the API surface (`open<D,R>`, `defineModal`, `ModalHost`, `ServiceModalProps`, `ServiceModalConfig`), the injected-props content contract, integration with the existing `Modal` (async submit lifecycle reused), promise/callback semantics with event ordering, exposure & mounting (singleton + `client-only`, server layout with client host leaf), behavior rules (stacking, persistence, StrictMode discipline, config precedence), and the definition of done (tests in `components/modal/service/__tests__/`, "Modal service" section on the `app/modal` demo page, CONTEXT.md terms).

The four Modal Service terms (Modal Service, Modal Host, Open, Per-modal open) were added to `CONTEXT.md` under a new "Modal Service terms" section.

Destination reached.


## Question

Assemble `.scratch/modal-service/spec.md` from all resolved tickets: the API (`open`, `defineModal`, `ModalHost`, config with `onSubmitResult`/`onClosed`), the `<D, R>` typing story, stacking behavior, edge-case rules, and the demo/test expectations. Add the new terms to `CONTEXT.md` (per the naming ticket). This is the destination artifact handed to the implementation session.

Blocked by: 01, 08, 09, 10
