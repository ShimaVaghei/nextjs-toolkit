# 05 — After-submit / after-close hooks

Type: grilling
Status: resolved

## Question

Where does "do something after submit" and "after close" logic live?

## Answer

**Callbacks declared in the config**: the service calls `onSubmitResult(result: R)` when a submit lands and `onClosed()` on any close. The promise is still returned too.

- Callbacks are the configured mechanism (fire-and-forget opens don't have to `.then()`).
- The promise remains available for callers who prefer `await`.
- Ordering between `onSubmitResult`, `onClosed`, and promise settlement is a detail for the spec ticket.
