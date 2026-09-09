# 10 — Edge cases & teardown

Type: grilling
Status: open

## Question

Which edge cases must the spec pin down?

Candidates:

- A modal is open when its caller unmounts / navigates: does the promise settle (resolve undefined) or leak?
- StrictMode double-invoke of effects with the singleton store.
- Two `defineModal` opens of the same modal concurrently.
- Config precedence in wrappers: definition-time config vs per-call config overrides.
- What the spec requires as demo page / unit test coverage (consistent with existing Modal demo + `__tests__` conventions).

Blocked by: 08
