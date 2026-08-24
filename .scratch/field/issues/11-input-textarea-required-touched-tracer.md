# 11 — Input & textarea Field with required + Touched lifecycle (tracer bullet)

Type: task
Status: ready-for-agent

## What to build

The first vertical slice of the **Field** component: a reusable client-side component rendering exactly one labeled form control from a flat `FieldConfig` — the `input` kind narrowed by Input type (`text`, `email`, `password`) plus the `textarea` kind — controlled: value lives in the parent, changes flow back through the single change callback.

This slice lights the whole feedback path end to end:

- Presentation props: label (explicitly associated), hint line, disabled, className; controls sit under the label with the widened gap from the feedback-rail prototype verdict.
- `required` over **Empty** semantics for textual kinds (`""`, `null`, `undefined`; whitespace-only trims to Empty without altering the stored value), built-in default message.
- Touched lifecycle: pristine invalid values stay silent; first blur marks Touched *and* runs the Validator immediately; afterwards every change re-evaluates; fixing clears the Error instantly; at most one Error shows.
- Accessibility floor: an always-mounted error `<p>` carrying `aria-live="polite"` referenced by the control's `aria-describedby` ordered hint→error (neither node ever conditionally unmounted); `aria-invalid` only while an Error shows; visually-hidden "Error:" prefix inside the message; required marker renders `*` beside the label plus visually-hidden "(required)"; `aria-required` set; `disabled` omitted entirely when enabled.

Seed the demo page at route `/field` with this section. Tests pin the lifecycle and DOM/a11y floor at the public seam (component + config + ref only), mirroring how the Table suite drives TableConfig/TableHandle.

Full decisions: the Field spec (`../spec.md`); canonical terms in `CONTEXT.md`.

Blocked by: None — can start immediately.

## Acceptance criteria

- [ ] A Field renders labeled input/textarea controls driven entirely by config; typing calls the change callback with each edit
- [ ] Whitespace-only input counts as Empty while the stored value stays untrimmed
- [ ] Pristine invalid → silent; first blur evaluates and reveals the Error; later changes re-evaluate; fixing clears immediately
- [ ] Error `<p>` always mounted and polite; `describedby` orders hint→error; `aria-invalid` present only on failure; sr-only "Error:" prefix in the message
- [ ] Required marker renders `*` + visually-hidden "(required)"; `aria-required` on the control
- [ ] Hint renders when configured; disabled works and omits the attribute when enabled; className reaches the wrapper
- [ ] Demo page section visible at `/field`
- [ ] Lifecycle + a11y-floor tests green at the public seam; lint and typecheck pass
