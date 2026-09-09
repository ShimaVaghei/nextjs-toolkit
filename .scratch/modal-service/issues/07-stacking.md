# 07 — Stacking

Type: grilling
Status: resolved

## Question

Can multiple modals be open at once?

## Answer

**Yes — stacked.** Multiple modals may be open simultaneously; the `ModalHost` renders them in open order (later modals visually on top).

- The promise-per-open model makes stacking natural: each `open()` awaits independently.
- Backdrop/Escape behavior with a stack (does Escape close only the top modal?) is a spec ticket detail.
