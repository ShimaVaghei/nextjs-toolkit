# 02 — Cell rendering per column type

Type: prototype
Status: resolved
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

## Answer

**Winner: Variant A (Plain & native) with B's image rendering and B's empty state.** Prototype (three takes at `app/prototype/table-cells/`, on a throwaway `prototype/table-cell-rendering` branch) settled the rendering contract per `TableColumnType`:

| Type | Rendering |
|---|---|
| `text` | Plain string of the value; `transform` applied first (its output is what renders). |
| `date` | `Intl.DateTimeFormat("en-US", { year, month: "short", day })` — e.g. `Jun 12, 2023`. Rendered in `<time dateTime>`. |
| `datetime` | Same + `hour`, `minute` — e.g. `Nov 2, 2024, 2:20 PM`. `<time dateTime>`. |
| `array` | Comma-joined string `value.join(", ")`. No chips, no truncation. |
| `image` | `<img>` `h-10 w-10 rounded-lg shadow-sm`; `alt` from the row's name column + `" thumbnail"` (or empty `alt` if none). |
| `number` | Plain `String(value)`, no thousands separators or forced decimals, left-aligned. |

**Empty value** (`undefined`/`null`, any type): a single em-dash — `<span className="text-neutral-400">—</span>`.

**Composition**: `transform` runs before type rendering; `class` (static) and `dynamicClass` (per-row) merge onto the cell; `hidden` drops the column entirely.

Feeds ticket 06 (the build) — the contract is the renderer spec.