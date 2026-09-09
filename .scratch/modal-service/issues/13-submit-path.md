# 13 — Submit path: sync and async results

**Status:** ready-for-agent

**What to build:** modals can return results. The service injects `submit(R | Promise<R>)` alongside `data` and `close`, wired into the existing Modal's `onSubmit` so its async lifecycle is reused untouched: a plain result resolves and closes immediately; a submitted promise puts Apply into its busy state and closes on resolve, stays open with Apply idle on reject. Full event ordering holds: `onSubmitResult(R)` → modal removed → `onClosed()` → promise resolves with `R`; a rejection fires nothing.

Spec: `.scratch/modal-service/spec.md` (sections: Integration with the existing Modal, Promise and callback semantics).

**Blocked by:** 12

- [ ] Injected `submit` accepts `R | Promise<R>`; a plain `R` resolves `open()` with `R` and closes the modal
- [ ] A submitted promise drives the existing busy/reject lifecycle — Apply busy while pending, auto-close on resolve, stay-open on reject with nothing fired
- [ ] Ordering verified: `onSubmitResult(R)` fires before the modal leaves the stack, `onClosed()` before the promise settles with `R`
- [ ] Cancel after a failed submit still resolves `undefined`
- [ ] Unit tests cover the sync path, the async resolve path, the reject path, and callback/promise ordering
