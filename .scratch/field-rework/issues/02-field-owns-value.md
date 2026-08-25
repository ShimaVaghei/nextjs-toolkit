# 02 — Field owns its value (seed-once + ref control)

**What to build:** The Field stops requiring parent-owned state. A form builder can render a fully working field with no change callback at all: the optional Initial value seeds internal state exactly once at mount, every subsequent change is handled inside the Field, and the optional observer hears about every change regardless of who caused it. The ref becomes the parent's steering wheel — read the current value or install a new one through the same pipeline as a user edit. The demo page grows an uncontrolled example, and the whole suite migrates off the controlled contract.

**Blocked by:** 01 — Prefactor: prefix all exported Field types.

**Status:** ready-for-agent

- [ ] A field renders, accepts edits, and validates with no observer callback configured
- [ ] The Initial value seeds once at mount; undefined is allowed for every kind; a changed prop after mount is ignored and draws a dev-only console warning
- [ ] The observer fires for user edits and for imperative sets alike — one honest stream
- [ ] `getValue()` on the FieldHandle returns the current internal value including undefined
- [ ] `setValue()` updates internal state, fires the observer, and re-evaluates the Error when Touched
- [ ] `validate()` behaves exactly as before (force-run, shows Error, returns validity)
- [ ] Empty, Touched, Error, Chip, Pending/Rejected semantics unchanged
- [ ] Full test suite migrated to the seed-once contract and green; demo page migrated and shows an uncontrolled field
