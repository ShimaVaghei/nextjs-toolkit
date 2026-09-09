# 03 — Content contract

Type: grilling
Status: resolved

## Question

How is the modal's content supplied, and how does it receive the data (D) and the way to resolve (R)?

## Answer

**`open` takes a component type, not an element**: `open(ConfirmModal, data, config)` renders `<ConfirmModal data={data} …injected/>`.

- The service injects typed props: `data: D` and the channels for submitting a result (R) and closing.
- Per-modal typing flows from the component's props, so `open` is generic over `<D, R>` and callers get full type inference.
- Rejected: passing an already-created `ReactNode` (the service would have no typed way to hand in data and the resolve channel).
