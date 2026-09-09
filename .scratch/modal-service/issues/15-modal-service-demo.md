# 15 — Demo: "Modal service" section on the Modal demo page

**Status:** ready-for-agent

**What to build:** the spec's manual demo coverage — a "Modal service" section added to the existing Modal demo page (no new page or route), consistent with the other demo sections. It exercises a resolved submit, a failed submit, and a cancel, using at least one per-modal open function from the factory, with an outcome line beside the trigger like the existing async-submit demo.

Spec: `.scratch/modal-service/spec.md` (section: Definition of done).

**Blocked by:** 14

- [ ] Demo section opens a modal via a `defineModal`-created open function from a button click
- [ ] Demo covers all three outcomes: submit resolves (result shown), submit rejects (modal stays open), dismiss (undefined result)
- [ ] Demo follows the existing page's conventions (section framing, trigger buttons, outcome status line) and leaves the existing sections untouched
