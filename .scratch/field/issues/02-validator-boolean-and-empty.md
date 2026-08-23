# Validator on boolean and the definition of empty

Type: grilling
Status: open

## Question

Close the remaining Validator semantics per kind:

1. What does `required` mean for the `checkbox` kind — must `false` be treated as empty (the consent-checkbox pattern), or does required not apply to checkbox?
2. Are non-applicable rules silently ignored (e.g., `min`/`max` on a text input), or should the types reject them where feasible?
3. Finalize "empty" per kind in `CONTEXT.md`: `""`, `null`, `undefined`, empty arrays — and whatever #1 decides for booleans.
