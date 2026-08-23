# Accessibility and DOM contract

Type: research
Status: resolved

## Question

Which ARIA/DOM wiring should Field use, verified against WAI-ARIA authoring practices (web sources, not local convention):

1. Label↔control association (`htmlFor`/`id`) including the multi-select checkbox rows.
2. Error announcement: `aria-describedby`, `role="alert"`, or `aria-live="polite"` — which, wired to what.
3. Invalid state signalling (`aria-invalid`, `aria-required`).
4. Grouping the multi-select checkbox rows: `fieldset`/`legend` vs `role="group"`/`aria-labelledby`.

Deliverable: a concrete attribute checklist per Field kind that the implementation ticket can apply directly.

## Answer

Researched against W3C WAI tutorials, WAI-ARIA techniques (ARIA19/21), MDN ARIA reference, and GOV.UK design-system patterns (2026).

**Error announcement — decided:** an *always-mounted* error `<p id={errorId}>` carrying `aria-live="polite"`, referenced by the control's `aria-describedby`, paired with `aria-invalid`. The pre-rendered node makes the live region fire reliably (a live region only announces if it existed before its content changed); `role="alert"` is rejected (spurious "Alert:" prefix, injection special-casing, VoiceOver double-speak) and reserved for form-level error summaries — out of scope here. Politeness: `polite`, never `assertive`.
Sources: https://www.w3.org/WAI/tutorials/forms/notifications/, https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19/, https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions

**describedby order — hint first, error last** (`[hintId, errorId].filter(Boolean).join(" ") || undefined`): context before corrective instruction; matches GOV.UK canonical output. Never conditionally mount/unmount either node (dangling references drop descriptions in some screen readers).
Source: https://design-system.service.gov.uk/components/error-message/

### Per-kind checklist

> **Superseded (2026-08-23):** the multi-select section below was invalidated by [Select presentation policies](01-select-presentation-policies.md) — multi-select is now a custom popup, not flat checkbox rows. Its replacement ARIA contract is owned by [Multi-select popup accessibility contract](06-multi-select-popup-a11y.md). All other sections stand.

- **input / textarea**: `<label htmlFor={id}>`; `type={inputType}` (input only); `disabled` omitted entirely when enabled; `aria-required={required || undefined}`; `aria-invalid={error ? true : undefined}` — **only** when an error is actually shown, never proactively on empty-but-required fields (MDN: don't flag until submit attempt; aligns with our Touched heuristic); `aria-describedby={hintId errorId}`; textarea adds `rows` (visual only). Error/hint `<p>`s sit outside the control.
- **select**: same core set as input. Placeholder renders as a disabled first `<option value="">` ("Please select…") — placeholder is never a label substitute; never pre-select a real option. No `aria-busy` while options load (not warranted for native controls) — disable + hint line instead.
- **multi-select**: wrap all options in `<fieldset>` + `<legend>{label}</legend>`; hint/error `aria-describedby` goes on the **fieldset**; **no `aria-required`/`aria-invalid` on the group** (unsupported roles there — convey requiredness via legend text); each option is checkbox+explicit label pair; `disabled` on the fieldset natively disables descendants.
  Sources: https://www.w3.org/WAI/tutorials/forms/grouping/
- **checkbox (single)**: explicit `htmlFor`/`id` association (not label-wrapping — AT support), label visually right of the box, no fieldset machinery; `aria-describedby`/`aria-required`/`aria-invalid` go directly on the input (all supported for the checkbox role).

### Gotchas adopted

- Prepend a visually-hidden `"Error:"` prefix inside the error text (GOV.UK pattern) so the message isn't identified by color alone.
- Skip `aria-errormessage` — support trails `aria-describedby`.
- Required-marker ARIA equivalent = `aria-required` + the word "(required)" in label/legend text; a bare `*` conveys nothing non-visually.

### Conflicts flagged against locked decisions (for the human to arbitrate)

1. **Required marker**: we locked `*` beside the label; research says an unexplained asterisk fails WCAG info-conveyance — recommended pairing is `*` **plus** visually-hidden "(required)" (or visible "(required)" text). Cheap fix, needs a yes/no.
2. **autoComplete**: we deferred `name`/`autoComplete` past v1; research notes meaningful `autocomplete` tokens satisfy WCAG 1.3.5 Identify Input Purpose (W3C's own examples wire them on every field). Deferring stays viable but is now an acknowledged a11y gap rather than an oversight.
