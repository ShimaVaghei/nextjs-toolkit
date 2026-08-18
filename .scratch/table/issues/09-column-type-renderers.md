# 09 — Column type renderers

**What to build:** The per-type cell rendering contract, so a column's `type` picks its renderer and the remaining display knobs work. `date`/`datetime` format via `Intl` inside a native `<time>`; `array` comma-joins; `image` renders a small rounded thumbnail with a name-derived `alt`; `number` renders the raw string left-aligned. A column `transform` runs before type rendering, static `class` and per-row `dynamicClass` merge onto the cell, `hidden` drops the column, and empty values render the muted em-dash for every type.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] `date` cells show `Intl`-formatted short dates and `datetime` cells date+time, each inside a native `<time dateTime>` element.
- [ ] `array` cells render as a comma-joined string; `image` cells as a small rounded `<img>` with an alt derived from the row's name column (empty alt when none); `number` cells as plain left-aligned raw strings.
- [ ] `transform` output is what renders; static `class` and per-row `dynamicClass` merge onto the cell; `hidden` columns render no column at all.
- [ ] `null`/`undefined` values render the muted em-dash regardless of type.
- [ ] Tests assert each type's rendering, the composition of `transform`/`class`/`dynamicClass`/`hidden`, and the em-dash empty state.