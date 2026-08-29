# 01 — Consolidate the date value model into one lib date module

Status: ready-for-agent
Spec: `../spec.md` (see "Date value model (step 3)" under Implementation Decisions)

## Task

Merge `lib/date-display.ts` (display formatters + `DATE_ONLY_PATTERN`) and `lib/date-normalize.ts` (`normalizeDateInput`, its types, and private helpers) into a single deep date module, `lib/date.ts`. Add the shared parts helpers Field currently duplicates privately (`utcDateParts`, `pad2`) as exports. Delete both old files in the same change — hard cut, no re-export shims.

## Steps

1. Create `lib/date.ts` containing: `DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, `DATE_ONLY_PATTERN`, `DateInputKind`, `FieldDateRangeValue`, `normalizeDateInput`, and now-exported `utcDateParts` / `pad2`.
2. Update importers: `components/Field.tsx`, `components/Table.tsx`, and the date test file (rename to `lib/date.test.ts`).
3. In `components/Field.tsx`, replace the private `utcDateParts`, `pad2`, and duplicate `Intl` formatters (`CELL_LABEL_FORMATTER`, `MONTH_YEAR_FORMATTER` where they duplicate the shared ones) with imports from the shared module.
4. Delete `lib/date-display.ts` and `lib/date-normalize.ts`.
5. Run `pnpm test`, `pnpm lint`, and `npx tsc --noEmit`.

## Acceptance

- No file in the repo imports from `date-display` or `date-normalize`.
- Existing date normalize tests pass unchanged in their new home; light direct tests exist for `utcDateParts`/`pad2`.
- Full suite green; no behavior change.
