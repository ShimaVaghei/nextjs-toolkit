# 01 — Prefactor: prefix all exported Field types

**What to build:** No new behavior — a purely mechanical rename pass that gives every exported type in the Field family the `Field` prefix, so later tickets build against the final vocabulary from the spec. Consumers (the component itself, its test suite, and the demo page) import the new names; runtime behavior is byte-identical and CI stays green throughout.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every exported Field-family type carries the prefix: `FieldInputType`, `FieldOption`, `FieldValidator`, `FieldRequiredRule`, `FieldMinRule`, `FieldMaxRule`, `FieldMinLengthRule`, `FieldMaxLengthRule`, `FieldRegexRule` (`FieldKind`, `FieldValue`, `FieldConfig`, `FieldHandle` are already prefixed)
- [ ] No old unprefixed name remains exported anywhere in the codebase
- [ ] Test suite passes with changes limited to import/reference renames
- [ ] Demo page compiles against the renamed exports
