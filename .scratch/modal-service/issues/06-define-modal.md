# 06 — Per-modal wrappers (defineModal factory)

Type: grilling
Status: resolved

## Question

How are the one-function-per-modal wrappers created and typed?

## Answer

**A `defineModal()` factory**: `const openConfirm = defineModal(ConfirmModal)` returns a typed open function (`openConfirm(data) → Promise<R | undefined>`), reusing the generic `<D, R>` plumbing so each wrapper stays fully inferred with no manual type annotations.

- Wrappers may pin extra config (title, size, texts) at definition time; how much of the config is fixed vs per-call is a spec ticket detail.
- Rejected: hand-writing each wrapper as a plain function (duplicates typing plumbing per modal).
