# 02 — Cell rendering per column type

Type: prototype
Status: open
Blocked by: 01

## Question

How should each `TableColumnType` render a cell value?

- `text` — the default; plain string rendering, `transform` applied.
- `date` / `datetime` — formatting (Intl? fixed format?), timezone handling.
- `array` — how are array values rendered (join? chips? first-N + ellipsis?)?
- `image` — what element/attributes (alt text source?), sizing.
- `number` — alignment, thousands separators, decimals?

Also decide how `transform`, `class`, `dynamicClass`, and `hidden` compose with type rendering, and what the empty-value (`undefined`/`null`) rendering is.

Work via the `/prototype` skill — make a rough concrete take to react to, then record the decision. The answer records the rendering contract per type; block the build (06) on it.