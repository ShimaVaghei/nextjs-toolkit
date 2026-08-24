# 13 — Checkbox kind — consent pattern

Type: task
Status: ready-for-agent

## What to build

Add the `checkbox` Field kind: one box with its label visually right of it, explicitly associated (no wrapping-label — explicit association only), no fieldset machinery. On a checkbox, `required` means must-tick: `false` counts as Empty (the consent-checkbox pattern, mirroring HTML5 native behaviour), and once Touched the usual lifecycle applies. Accessibility attributes ride directly on the input — `aria-describedby`, `aria-required`, `aria-invalid` are all supported for the checkbox role.

Full decisions: the Field spec (`../spec.md`); Empty definition in `CONTEXT.md`.

Blocked by: 11 — Input & textarea Field with required + Touched lifecycle (tracer bullet).

## Acceptance criteria

- [ ] A checkbox Field renders with its label right of the box, explicitly associated via `htmlFor`/`id`
- [ ] `required` rejects `false` as Empty and accepts `true`; unticked required fields follow the Touched lifecycle (silent pristine → blur reveal → change re-evaluates)
- [ ] `aria-required`, `aria-invalid`, and `describedby` sit directly on the input; error/hint `<p>`s stay outside the control
- [ ] Demo page gains a checkbox section; the consent pattern is pinned by a test at the public seam; lint and typecheck green
