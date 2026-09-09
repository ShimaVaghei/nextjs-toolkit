# 14 — defineModal factory with config precedence

**Status:** ready-for-agent

**What to build:** per-modal open functions. `defineModal(component, definitionConfig?)` returns a named, fully-inferred open function for one specific modal (`const openConfirm = defineModal(ConfirmModal)`), so callers write `openConfirm(data)` with no manual type annotations. Definition-time config shallow-merges with the per-call config, per-call winning on key conflicts; concurrent opens of the same per-modal open stack independently.

Spec: `.scratch/modal-service/spec.md` (sections: API surface, Behavior rules — Wrapper config precedence).

**Blocked by:** 13

- [ ] `defineModal` returns an open function with `D` and `R` fully inferred from the modal component's props
- [ ] Definition-time config (title, size, labels) applies by default; per-call config overrides it key-by-key (shallow merge)
- [ ] Two calls to the same per-modal open function stack two independent instances with independent promises
- [ ] Unit tests cover type inference, precedence, and concurrent same-modal opens
