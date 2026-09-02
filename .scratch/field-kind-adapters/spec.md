Status: ready-for-agent

# Spec: Per-kind render adapters behind one `FieldControl` seam

## Problem Statement

`components/field/Field.tsx` is a 1,946-line module whose render is a single ten-way `kind ===` switch (~700 lines) fused directly into the value engine. The module's recent hot spots all landed inside that switch — the chips `Selection display`, the text-face multi-select that opens the Options popup, the equalized select/multi-select control height, and the calendar **Draft** preview. Every future Field kind or per-kind face tweak currently forces a contributor to navigate, and risk regressing, the whole engine: there is no seam where one kind begins and the engine ends. The deletion test fails — you cannot delete one kind's branch without deleting part of the engine's sequential commit/touched/validation logic that the branch is interleaved with. Understanding one kind (say the number-range) requires holding roughly 1,900 lines of call graph in your head.

## Solution

Carve each Field kind's renderer out of the engine into a package-internal render adapter (a "Control" module), all behind one shared props seam — the `FieldControl` interface. The engine keeps the value lifecycle it already owns — value ownership, **Commit**, test-on-blur, the imperative `FieldHandle`, and option-loading for the choice kinds — and hands each renderer a narrow contract: `id`, `label`, `value`, `hint`, `required`, `error`, `disabled`, `onCommit`, plus the kind's presentation variation (options/selection display for choice kinds, bound labels and `min`/`max`/`step` for ranges). The public interface of `@/components/field` — the ten wrapper components (`InputField`…`NumberRangeField`), the plain-data configs, and the handle — is unchanged, so no caller and no existing test edits its imports. The monolith becomes a deep engine plus deep, independently-navigable leaves.

## User Stories

1. As a developer changing the number-range kind, I want its entire renderer in one owning module, so that I touch only that module and never the value engine.
2. As a developer changing a select face, I want the select renderer isolated, so that a face tweak cannot regress the other nine kinds.
3. As a developer, I want every kind's renderer to receive value and test-on-blur semantics through one shared `FieldControl` contract, so that each renderer is a thin, predictable adapter.
4. As a developer, I want the engine to keep owning the value lifecycle (commit, touched, validation, handle), so that per-kind renderers never re-implement value semantics.
5. As an app developer, I want the ten wrapper components and their configs untouched, so that my existing call sites and tests keep working without changes.
6. As a developer, I want an eleventh Field kind to be a new render adapter behind the same seam, so that adding a kind never means editing a giant switch.
7. As a maintainer, I want each kind's per-kind test suite to read against its own renderer, so that a failing test points at one module rather than a monolith.
8. As an end user, I want rendering identical to today for every kind, so that the refactor is a pure structural change with no visual or behavior drift.
9. As a developer working on the date kinds, I want the `CalendarPopup` composition contained in the date adapter, so that calendar concerns stop leaking through the engine.
10. As a developer, I want the choice kinds' disclosure/popup state to travel with their adapters, so that the select/multi-select modules are self-contained rather than reaching back into engine-owned refs.
11. As a future contributor, I want each Control module importable and testable on its own, so that card-level render tests have a seam without rendering every kind.
12. As a maintainer, I want the per-kind division to follow the codebase-design "deep module" shape — engine + deep leaves — so that the module's depth increases and its interface stays small.
## Implementation Decisions

- **One shared seam: the `FieldControl` props contract.** The engine resolves each kind to a render adapter via this interface. Core fields are `id`, `label`, `hint`, `required`, `error`, `disabled`, `value`, and `onCommit`. Per-kind variation rides as additional typed props on the same object (e.g. `options` + `selectionDisplay` + `optionsStatus` for the choice kinds; bound labels and `min`/`max`/`step` for the number-range; `inputType`/`placeholder`/`autoFocus` for `input`). The engine passes committed value and `onCommit` down; renderers never mutate value themselves.
- **The engine keeps the value lifecycle.** Ownership of the committed value, **Touched** on blur, the observer stream, the imperative `FieldHandle`, test-on-blur validation, and (for choice kinds) option-loading + disclosure state all stay in the engine or move into a small set of package-internal hooks the adapters call. The division is: engine = value + lifecycle; adapter = presentation of that value.
- **Choice-kind popup/disclosure state travels with the adapters.** For select and multi-select, the open/search/refs/focus-hop machinery is lifted into a package-internal hook (`useOptionsPanel`-shaped) consumed by both adapters — two consumers make the shared abstraction real, not hypothetical. This lets the adapters be self-contained instead of reaching into engine-owned refs, and is what makes a choice kind genuinely deep-liftable.
- **Date adapters own the `CalendarPopup` composition.** The four date kinds render through a shared date adapter that composes `CalendarPopup`, including Draft preview wiring; calendar concerns no longer leak through the engine's render switch.
- **Order of extraction follows the codebase's own focus.** Trivially-isolated kinds (`input`, `textarea`, `checkbox`, `number-range`) extract first with no popup dependency; the choice and date kinds follow once their disclosure/calendar state is lifted. Each extraction is a separate, reviewable step that leaves the suite green before the next.
- **Public wrapper layer unchanged.** `InputField`…`NumberRangeField` and every wrapper-specific config alias stay exactly as they are; they stamp the kind and forward to the same engine, which now delegates rendering. The `index.ts` barrel still re-exports only the public interface — the Control modules are package-internal and not re-exported (the `eef30af` boundary rule).
- **No behavior change.** Identical DOM output and identical interactions for every kind; this is a structural re-partition that the existing per-kind suites must prove by passing unchanged.

## Testing Decisions

- **Good tests assert external behavior, not implementation details** — and the highest seam stays the public wrapper (render a wrapper, interact, assert committed value / error / handle). That seam already covers the adapters end to end.
- **Primary regression seam: the existing per-kind wrapper tests.** Because rendering must be byte-for-byte identical, the full battery (`InputField`…`NumberRangeField` suites plus `Field.test.tsx`) passing unchanged is the correctness proof for each extraction step.
- **Secondary seam for new cover: the Control modules themselves.** Once a kind's renderer is a standalone module, it can be rendered/tested in isolation for concerns the wrapper suites don't isolate (e.g. the number-range's From/To layout, a select's face states). Prior art is the module-level style in `components/field/__tests__` and the direct-import unit tests already used for `calendarShared`.
- **Choice-kinds:** test the disclosure contract through the adapter once the `useOptionsPanel`-shaped hook is lifted, mirroring how `CalendarPopup` is already tested through its own public interface.
- No test imports or expectations need editing for the refactor itself; new tests are additive.

## Out of Scope

- **No change to the value engine's semantics** — commit, touched, validation, observer, handle behavior are preserved and tested as-is.
- **No change to the public API** — wrappers, configs, `FieldHandle`, and the barrel are stable.
- **No re-export of the Control modules** — they are package-internal, matching the calendar boundary precedent.
- **No reuse of the shared tokens/helpers module work** beyond importing from it — extracting those is Candidate 2, tracked separately.
- **No new Field kinds** are added in this work; the seam is prepared for them, but none ships here.
- **No presentational-leaf extraction** (`OptionsPanel`, chip strip as standalone public components) beyond what the adapters already own — that is a further candidate.

## Further Notes

This is the load-bearing deepening for the Field module: it converts a wide, flat render switch into a deep engine plus deep leaves, so "a change to one Field kind has an owning module." Its public interface never changes, so all existing callers and the ten per-kind test files keep their contracts. It depends on Candidate 2 (the shared tokens/helpers home) so adapters import from a clean module, and on lifting the choice-kind disclosure machinery so the select and multi-select adapters are truly self-contained.