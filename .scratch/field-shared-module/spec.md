Status: ready-for-agent

# Spec: Co-located `fieldShared.ts` + one owner for the kind predicates

## Problem Statement

`components/field/Field.tsx` is a 1,946-line module. Roughly 480 of those lines are mechanical — pure helpers and ~25 Tailwind CSS-token constants — that sit on top of the value engine and the ten-kind render switch. The sibling `calendar` module already solved this exact shape: `CalendarPopup.tsx` + `YearMonthOverlay.tsx` share their tokens and pure date helpers through a package-internal `calendarShared.ts`. The `field` module never took that step, so understanding the value engine means wading through a wall of uninteresting constants and helpers first.

Worse, this is a real seam leak, not just cosmetics: `isDateKind` and `isNumberInput` are each **duplicated verbatim** in both `Field.tsx` and `lib/field-validation.ts`. Neither is exported, so each file silently carries a private twin. These are the codebase-design "two adapters of the same concept" signal — and the twins have already begun to drift apart in intent (the validation side fits rules by them; the Field side wires rendering by them). Any future change to which kinds count as "date" or as "number input" now has two places to edit and no compiler forcing them to agree.

## Solution

Introduce a package-internal `fieldShared.ts` in `components/field/`, mirroring the calendar module's `calendarShared.ts`. It owns the CSS-token constants and the pure, React-free helpers currently in `Field.tsx`, moved verbatim. Promote `isDateKind` and `isNumberInput` to single exported owners in `lib/field-validation.ts` (the lower layer that already uses them for rule fitting) and have the `field` package import them — deleting its local copies. The public interface of `@/components/field` — the wrappers, plain-data configs, and imperative `FieldHandle` — is unchanged. `fieldShared.ts` is package-internal and not re-exported, exactly as `calendarShared.ts` already is (see the `eef30af` boundary decision). `Field.tsx` shrinks by roughly a quarter with zero behavior change; existing tests pass unmodified.

## User Stories

1. As a developer maintaining the Field module, I want the CSS-token constants and pure helpers co-located in a shared module, so that I no longer wade through ~480 lines of mechanical code to read the value engine.
2. As a developer, I want the calendar module's file structure mirrored in the field module, so that the two sibling packages share one convention and an explorer who knows one navigates the other.
3. As a developer, I want a single owner for `isDateKind`, so that rule fitting and rendering wiring classify date kinds the same way and can never drift apart again.
4. As a developer, I want a single owner for `isNumberInput`, so that number-input coercion and rule fitting share one predicate.
5. As a developer, I want `lib/field-validation.ts` to export the kind-predicates it already owns, so that the `field` package can import them instead of re-implementing them.
6. As a developer, I want the `field` package to import `isDateKind`/`isNumberInput` rather than redefine them, so that the verbatim duplicates are deleted for good.
7. As a developer, I want `fieldShared.ts` to be package-internal and never re-exported from the barrel, so that no new public interface is created and callers cannot couple to internal tokens.
8. As a developer, I want the extraction to be purely mechanical, so that no behavior changes and the existing test battery passes untouched.
9. As a future contributor, I want the pure helpers (`resolveChips`, `resolveSelectFace`, the `coerce*` family) testable directly at the module seam, so that card-level unit tests get a home without a DOM.
10. As a developer touching the number-range kind, I want its coercion and normalization helpers co-located with the other pure logic, so that they are not buried inside the engine.
11. As an app developer using `@/components/field`, I want no change to the public API, so that I keep using the same wrappers, configs, and handle.
12. As a maintainer, I want a single place that lists every Tailwind token the Field surfaces share, so that visual parity across kinds is auditable in one file.
## Implementation Decisions

- **New package-internal module** `fieldShared.ts` in `components/field/`, mirroring `calendarShared.ts`. It owns the Tailwind CSS-token constants currently in `Field.tsx` (the label/control/hint/error/rejected/retry/checkbox/chip/selection-text/panel/row/trigger classes — ~25 constants plus the muted Option-load spinner element) and the pure, React-free helpers: `coerceNumberInput`, `coerceNumberRangeEnd`, `normalizeNumberRange`, `isRenderablePrimitive`, `fallbackLabel`, `describedStaleValue`, `chipIdFor`, `resolveChips`, `resolveSelectFace`, `sameInitial`, `isOptionsLoader`, and the supporting types (`MatchFn`, `IDENTITY_MATCH`, the object-chip identity counter/`Chip` shape, `SelectFace`, `OptionLoadStatus`). Each moves verbatim, preserving exact strings and bodies.
- **Single owner for the predicates.** `isDateKind` and `isNumberInput` are conceptually single-sourced already — both files define identical bodies — but neither is exported. Promote them to exported members of `lib/field-validation.ts`, which already uses them for rule fitting and is the Field vocabulary's lower layer. The `field` package imports them from `@/lib/field-validation` and deletes its local copies. Dependency direction stays downward: `lib/` is a dependency of `components/`, never the reverse. Two real adapters (the codebase-design trigger) collapse into one.
- **Barrel unchanged, boundary unchanged.** `index.ts` still re-exports only the public `Field` interface. `fieldShared.ts` is NOT re-exported — the commit `eef30af` ("Do not re-export package-internal calendar modules") already established this rule, and the calendar `calendarShared.ts` is the direct precedent. No new public surface is created.
- **No behavior change.** This is a pure move-plus-import refactor: exact class strings, helper bodies, and predicate bodies are preserved verbatim. `Field.tsx` drops the moved locals and imports them instead, shrinking by roughly a quarter of its lines. The value engine, the commit pipeline, and the ten-kind render switch are untouched.
- **Field kinds count stays outward-stable.** `FieldKind` and the wrapper set are not modified; the predicate promotion must not alter what any kind resolves to.

## Testing Decisions

- **Good tests assert external behavior, not implementation details** — but this refactor also introduces a legitimate package-internal module seam, and that seam is the new test surface for the pure helpers.
- **The seam to test the pure logic is `fieldShared.ts` itself** (a direct module import, no DOM), matching the calendar precedent: `Field.test.tsx` already imports `resolveCalendarPlacement` from `../../calendar/calendarShared` and unit-tests it directly. New direct unit tests for `resolveChips`, `resolveSelectFace`, and the `coerce*`/`normalizeNumberRange` family can live at the same level.
- **The existing public wrapper interface is the regression seam for "no behavior change."** The whole battery (per-kind wrapper tests, `Field.test.tsx`, and any validation tests) must pass unchanged. Because the move is purely mechanical, a green run is the correctness proof: any drift from a copy that regressed a behavior would surface as a failing pre-existing test.
- **Prior art:** `components/field/__tests__/Field.test.tsx` (module-level `calendarShared` unit tests) for the new direct-import tests; the existing `lib/field-validation.ts` tests (if present) for the predicate promotion.
- No test needs its import paths or expectations edited, because no public surface changes.

## Out of Scope

- **No change to the Field engine** — the value lifecycle, commit pipeline, or the ten-kind render switch. Splitting per-kind renderers out of the engine is Candidate 1, tracked separately.
- **No new public API** and no re-export of `fieldShared.ts` from the barrel.
- **No relocation of presentational React components** (`OptionsPanel`, chip rendering, status/Retry line) into leaves — that is a separate candidate.
- **No changes to the `calendar` module.**
- **No normalization of further predicates** beyond `isDateKind`/`isNumberInput` (a search confirms only these two are duplicated).

## Further Notes

This is the lowest-risk deepening and the prerequisite for the deeper split in Candidate 1: giving the shared tokens and pure helpers a home means the per-kind render adapters (and their tests) can import from `fieldShared.ts` rather than from the monolith. It follows the exact precedent the `calendar` module already set, so it both fixes the live seam leak (the drifting twin predicates) and aligns the two sibling packages to one convention.