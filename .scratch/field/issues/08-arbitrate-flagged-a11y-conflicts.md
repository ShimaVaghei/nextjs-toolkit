# Arbitrate flagged accessibility conflicts

Type: grilling
Status: resolved

## Question

[Accessibility and DOM contract](03-accessibility-dom-contract.md) closed with two conflicts parked "for the human to arbitrate" — neither has since been ruled on:

1. **Required marker**: the locked bare `*` beside the label conveys nothing non-visually; the research-recommended fix pairs it with visible or visually-hidden "(required)" text. Yes/no?
2. **`name`/`autoComplete`**: deferred past v1 during charting, but the research notes meaningful `autocomplete` tokens satisfy WCAG 1.3.5 Identify Input Purpose — the deferral is now an acknowledged a11y gap rather than an oversight. Keep the deferral, or pull a minimal passthrough into v1?

Each ruling may touch the map's scope lines and the [Implement Field](05-implement-field.md) checklist.

## Answer

Arbitrated by grilling (2026-08-23); both conflicts from the research's flag list are now closed.

1. **Required marker — keep `*`, add visually-hidden "(required)".** The locked asterisk stays visually; a visually-hidden "(required)" rides beside it so screen readers announce requiredness (a bare symbol conveys nothing non-visually). `aria-required` remains the programmatic signal. Applies wherever requiredness renders — labels, and any popup/legend context owned by [Multi-select popup accessibility contract](06-multi-select-popup-a11y.md).
2. **`name`/`autoComplete` — deferral kept, reframed as accepted.** v1 ships with the WCAG 1.3.5 Identify Input Purpose gap explicitly documented as *accepted*, not overlooked. Rationale: the forms composition layer is out of scope, so standalone v1 Fields never submit — `name` does little work and `autocomplete`'s autofill value is limited without it. Revisit when a forms-composition effort exists; the map's Out of scope line now carries this rationale.

Implementation impact on [Implement Field](05-implement-field.md): render the sr-only "(required)" alongside `*`; no autocomplete wiring anywhere in v1.
