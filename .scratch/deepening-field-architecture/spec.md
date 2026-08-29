# Spec: Deepening the Field architecture

Status: ready-for-agent

## Problem Statement

`Field.tsx` is a 2,941-line monolith holding four separable concerns: the generic Field engine, the validation engine, the select/chips machinery, and the Calendar popup. The Calendar popup is where change pressure concentrates — 12 of the last 20 commits are popup bug fixes, each threading Draft/range/time state through a 32-prop seam. Validation logic (~470 lines of pure rules) can only be tested through rendered components. Date logic is split across two lib files plus private duplicates inside Field.tsx (its own `utcDateParts`, `pad2`, and `Intl` formatters), so "how a date renders and normalizes" lives in three places.

The result: poor locality (the "Draft" concept spans ~2,000 lines), no cheap test surface for validation or popup behavior, and concept drift risk in the date value model.

## Solution

Three deepening refactors, executed in the order below, each leaving the user-visible behavior of Field, Table, and the demo pages unchanged:

1. **Date value model** — consolidate the two date lib files into a single deep date module; Field's private date helpers are replaced by imports. Hard cut: old file names are deleted, not shimmed.
2. **Validation engine** — extract the pure rule engine into a lib module exporting exactly `evaluate` and `isEmpty`. Field calls one function; rule semantics tests become fast, DOM-free unit tests.
3. **Calendar popup module** — extract the Calendar popup into its own module that owns the Draft, range anchoring, time slices, and disclosure mechanics (outside click, Escape, focus return, placement flip). Field interacts through a small interface: seed value in, normalized committed value out.

## User Stories

1. As a developer fixing a calendar popup bug, I want all Draft/range/time logic in one module, so that my fix lands in one file instead of two regions of a monolith.
2. As a developer adding a date field kind, I want one date module owning format + normalize + parts, so that I cannot accidentally create a second, diverging date pipeline.
3. As a developer writing validation rules, I want the rule engine testable without rendering components, so that rule-semantics tests run fast and fail with precise messages.
4. As a developer testing Field, I want UI wiring tests (Touched gating, blur timing, observer firing) separated from rule-semantics tests, so that each test proves one thing at its own seam.
5. As a developer consuming Field, I want rule types re-exported from their existing import path, so that my imports don't break during the extraction.
6. As a developer reading CONTEXT.md's definition of Draft, I want the code's ownership to match the glossary exactly, so that the glossary is a reliable map of the codebase.
7. As a maintainer, I want the Calendar popup's interface reduced from 32 props to a small disclosure+commit interface, so that the deletion test passes: complexity concentrates behind one seam.
8. As a maintainer, I want Cancel and Escape to be indistinguishable to Field, so that discard semantics stay internal to the popup where CONTEXT.md places them.
9. As a maintainer, I want the Month/year picker overlay extracted as a private sibling only because it is genuinely self-contained (its own tests exist), so that we don't recreate the prop-plumbing seam one level down.
10. As a future contributor adding a second popup-like widget, I want the popup module's interface as the prior art, so that the new widget follows the same deep shape.
11. As a developer migrating old files, I want a hard cut with no re-export shims, so that there is exactly one true name per module and `git log --follow` tells the whole story.
12. As a CI pipeline, I want the full existing suite to pass unchanged after each step, so that each refactor is verifiably behavior-preserving.

## Implementation Decisions

Order of execution is smallest-risk-first: date consolidation → validation extraction → Calendar popup extraction. Run the full test suite after each step.

**Date value model (step 3):**
- One module: display formatters, the date-only pattern, `normalizeDateInput` and its types, and shared parts helpers (`utcDateParts`, `pad2`) in a single file. The old two files are deleted in the same change; all importers (Field, Table, the date test file) are updated; no shims.
- Field.tsx's private `utcDateParts`, `pad2`, and duplicate `Intl` formatters are replaced by imports from the shared module.

**Validation engine (step 2):**
- Interface: `evaluate(kind, validator, value, touched) → string | null` plus `isEmpty(value) → boolean`. `isEmpty` is exported as an exception because Empty is a CONTEXT.md domain concept with per-kind semantics; everything else (rule fitting, constraint unpacking, default messages) stays private.
- Rule types (`FieldValidator`, per-rule types) move to the lib and are re-exported from Field's existing import surface so no consumer import breaks.
- Signatures stay runtime-dispatched (`kind: FieldKind`, value loosely typed). Per-kind compile-time safety remains at the config-type edge (`FieldDateConfig` etc.); the lib trusts its caller. No generics.

**Calendar popup module (step 1):**
- New `components/calendar/` directory; the popup is the only public interface of the module. Private siblings are allowed only for genuinely self-contained pieces — the Month/year picker overlay qualifies (always opens at the year panel, manages its own two-step flow, has existing tests). ADR-0001's stacked UX is untouched; only ownership moves.
- The popup fully owns the Draft: seeded from the Field's current value on open, discarded internally on Cancel/Escape/outside click, never visible to Field until commit. Range anchoring, two-step pick, hover-range preview, and time slices are internal.
- The popup owns disclosure mechanics: outside click, Escape, focus return, and placement measurement. Field passes exactly one ref (the trigger) for focus return and placement.
- Agreed interface (8 entries, down from 32):

```
kind            // "date" | "datetime" | "date-range" | "datetime-range"
value           // current Field value; seeds the draft on open
min?, max?
triggerRef      // focus return + placement measurement
open, onClose   // disclosure control; Cancel and Escape both map to onClose
onCommit        // raw draft value; Field normalizes
```

- The popup commits the raw draft; Field runs it through `normalizeDateInput` and its observer + Error re-evaluation pipeline, identical to a user edit. Normalization has exactly one home (the lib module) and is called by Field only.
- Per commit `72106fe`, close is not automatic on pick; the popup stays open after range completion so the user can review and Apply. That policy stays inside the popup.

## Testing Decisions

- Good tests verify external behavior through a module's public interface, never internal state or rendering details.
- **Date module:** existing normalize tests port wholesale to the consolidated module's test file; display helpers gain light direct tests for the parts/format helpers that Field previously duplicated privately.
- **Validation module:** new DOM-free unit tests covering the CONTEXT.md contract — per-kind Empty rules (`""`, `null`, `undefined`, `[]`, `false`, trimmed whitespace), Touched gating, rule-kind fit, message resolution including custom messages — against `evaluate`/`isEmpty` directly. Prior art: the existing date normalize tests (pure-function vitest style).
- **Validation tests split rule:** when porting from Field's component tests, a test stays in Field if it would still pass with `evaluate` stubbed to a constant (wiring test); if it asserts message text or rule outcomes, its value moves to the lib suite. The inventory of which blocks fall on which side is reviewed before any deletion.
- **Calendar popup:** behavior tested through the module's public interface (seed → pick → commit/cancel flows for all four kinds; disclosure behavior; the ADR-0001 stacked overlay flow via its existing tests). Prior art: existing Field component tests and the overlay's cross-kind verification tests.

## Out of Scope

- Any change to user-visible behavior, class names, or demo pages.
- Splitting the select/chips machinery out of Field (a separate future candidate).
- Generically-typed (kind-correlated) validation signatures.
- Renaming or reshaping the Field config surface, or any CONTEXT.md glossary changes — the current definitions already match the target ownership.
- Side-by-side month/year layout (rejected by ADR-0001).

## Further Notes

- Origin: `/improve-codebase-architecture` review followed by a grilling session in which all ten design questions were resolved.
- Field.tsx is expected to shrink to roughly 2,000 lines after step 1; the remaining complexity there is genuinely React-shaped.
- The shallow 3-constant display module fails the deletion test as a standalone module; its content gets a real home inside the consolidated date module.

