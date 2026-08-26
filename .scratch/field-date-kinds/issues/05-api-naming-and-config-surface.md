Type: grilling
Status: resolved

## Question

Public API surface: final component names (DateField / DateTimeField / DateRangeField / DateTimeRangeField?), config type names (FieldDateConfig etc.), which presentation props apply to these kinds (does Placeholder exist on a calendar face or only its closed state? hint, disabled, className parity), Initial/onValueChange typing per kind including the range object shape, and the CONTEXT.md wording for the new kinds — keeping "Field kind" distinct from TableColumnType's `date`/`datetime` renderer names.

## Answer

- **Components**: `DateField`, `DateTimeField`, `DateRangeField`, `DateTimeRangeField` — the existing `<KindName>Field` pattern; no generic `Field` export appears.
- **Config types**: `FieldDateConfig`, `FieldDateTimeConfig`, `FieldDateRangeConfig`, `FieldDateTimeRangeConfig` — all non-generic (no Options), each composing `FieldCommonConfig<V>` with V fixed per kind.
- **Value shapes**: singles carry plain ISO strings (`initialValue?: string`, `onValueChange?(value: string)`, `Ref<FieldHandle<string>>`). Ranges share one exported type, `FieldDateRangeValue = { from?: string; to?: string }` — optional props chosen so a half-pick (legal held value per ticket 03) is representable and Initials construct naturally; whole-object absence stays `undefined` via the existing `getValue(): V | undefined` contract. Handles on range kinds are `Ref<FieldHandle<FieldDateRangeValue>>`.
- **Presentation props**: full parity — `hint`/`disabled`/`className` come from `FieldCommonConfig`; `placeholder` exists on all four kinds but renders only as the closed trigger face's ghost text while Empty (exactly like select), never inside the open calendar popup.
- **CONTEXT.md wording**: applied during this session — Field now names nine components; Field kind union gains the four date literals plus a sentence distinguishing kinds from TableColumnType renderer names (`date`/`datetime` collide by vocabulary coincidence only: a kind fixes which labeled control renders, a column renderer formats cell text); Placeholder mapping extends with "the empty trigger-face text on the date kinds".

Deeper glossary terms (Calendar popup, Draft/commit vocabulary) deliberately left to the implementation tickets — ticket 04's territory.
