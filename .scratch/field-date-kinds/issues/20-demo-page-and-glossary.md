# 20 — Demo page & glossary completion

**What to build:** Close the loop for maintainers and adopters: a demo-page usage exercising all four date Field kinds together — initials seeding each shape, validators in action, observers streaming values — alongside the remaining CONTEXT.md vocabulary the implementation surfaced: the Calendar popup term and the draft/commit interaction vocabulary, written consistently with the existing glossary style and the already-applied wording (nine components, extended kind union, the disambiguator separating Field kinds from Table column renderer names).

**Blocked by:** 18 and 19 (the demo exercises all four kinds, so both shipping slices must be complete).

**Status:** ready-for-agent

- [ ] Demo page demonstrates DateField, DateTimeField, DateRangeField, and DateTimeRangeField with representative configs (Initial values, validators, onValueChange observation)
- [ ] CONTEXT.md gains Calendar popup and draft/commit terms matching the shipped behavior
- [ ] New glossary entries avoid collisions with existing terms (Drawer, Options popup, Placeholder, Empty, Touched, Error)
- [ ] No documentation contradicts the settled contracts (serialization split, Empty semantics, swap rule)
