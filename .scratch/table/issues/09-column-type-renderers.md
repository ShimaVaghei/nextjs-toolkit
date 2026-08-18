# 09 — Column type renderers

**What to build:** The per-type cell rendering contract, so a column's `type` picks its renderer and the remaining display knobs work. `date`/`datetime` format via `Intl` inside a native `<time>`; `array` comma-joins; `image` renders a small rounded thumbnail with a name-derived `alt`; `number` renders the raw string left-aligned. A column `transform` runs before type rendering, static `class` and per-row `dynamicClass` merge onto the cell, `hidden` drops the column, and empty values render the muted em-dash for every type.

**Blocked by:** 08

**Status:** resolved

- [x] `date` cells show `Intl`-formatted short dates and `datetime` cells date+time, each inside a native `<time dateTime>` element.
- [x] `array` cells render as a comma-joined string; `image` cells as a small rounded `<img>` with an alt derived from the row's name column (empty alt when none); `number` cells as plain left-aligned raw strings.
- [x] `transform` output is what renders; static `class` and per-row `dynamicClass` merge onto the cell; `hidden` columns render no column at all.
- [x] `null`/`undefined` values render the muted em-dash regardless of type.
- [x] Tests assert each type's rendering, the composition of `transform`/`class`/`dynamicClass`/`hidden`, and the em-dash empty state.

## Answer

Implemented the per-type rendering contract in `components/Table.tsx`, built TDD on top of the ticket 08 shell (tests written first, red, then green).

Rendered behavior: `date` renders `Intl.DateTimeFormat("en-US", { year, month: "short", day })` — e.g. `Jun 12, 2023` — in a native `<time dateTime="YYYY-MM-DD">`; `datetime` adds `hour`/`minute` — e.g. `Nov 2, 2023, 2:20 PM` — in `<time dateTime="YYYY-MM-DDTHH:mm">`. `array` comma-joins (`value.join(", ")`); `image` renders `<img src>` with `h-10 w-10 rounded-lg shadow-sm` and `alt` from the row's `name` column + `" thumbnail"` (empty `alt` when the row has no name); `number` renders plain `String(value)` in a `text-left` cell. `transform` runs before type rendering (its output feeds the type renderer and the empty check); static `class` and per-row `dynamicClass` merge onto the `<td>`; `hidden` columns are filtered out entirely (header and cells). Unparseable `date`/`datetime` values fall back to their raw string. `null`/`undefined` of every type render the existing muted `text-neutral-400` em-dash.

Tests in `components/Table.test.tsx` (AppLayout conventions): date/datetime Intl text + `datetime` attribute (including date-string coercion and the unparseable-value raw-string fallback), array join, image src/classes/alt (including empty-alt when the name is blank), number plain-left-aligned, transform-before-type (raw garbage → formatted date), transform returning null → em-dash, static + dynamic class merge (per-row variation), hidden column dropped, and em-dash for all five null types. 13 new tests, 22 total in the file; full suite 107 green, typecheck clean, lint 0 errors (the existing `@next/next/no-img-element` warning is inherent to the ticket-02 decision of a native `<img>` thumbnail).