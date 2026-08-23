# Implement Field

Type: task
Status: closed
Blocked by: 01, 02, 03, 04, 06, 07, 08

## Question

Nothing left to decide — this is the map's single execution step (carried here by explicit owner override of plan-don't-do):

Build `components/Field.tsx` per the Form terms in `CONTEXT.md` plus the resolutions of [Select presentation policies](01-select-presentation-policies.md), [Validator on boolean and the definition of empty](02-validator-boolean-and-empty.md), [Accessibility and DOM contract](03-accessibility-dom-contract.md), [Demo page and test scope](04-demo-page-and-test-scope.md), and [Arbitrate flagged accessibility conflicts](08-arbitrate-flagged-a11y-conflicts.md).

Done when: lint, typecheck, and tests are green; the demo page renders under `app/field/`; any new terms coined along the way are in `CONTEXT.md`.

## Comments

Closed 2026-08-23 by owner decision — a scoping act, not a resolution. The plan-don't-do override that carried implementation into this map is reversed: wayfinder maps end at decisions, and building `components/Field.tsx` happens after the map closes, consuming the resolutions recorded here and in the map's Decisions so far. See the map's Out of scope section.
