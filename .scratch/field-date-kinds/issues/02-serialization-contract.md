Type: grilling
Status: resolved

## Question

Pin the exact value contract per kind. Emitted formats: `date`/`date-range` as `YYYY-MM-DDT00:00:00Z` (fixed zero time, no conversion); `datetime`/`datetime-range` as the real UTC instant obtained by interpreting the picked wall-clock as browser-local time — including how DST transitions are handled. Also settle: what `Initial`/`setValue` accept (which string forms are tolerated — with/without Z, offsets, missing seconds — and what happens on invalid input), seconds/milliseconds policy on output, and the display text shown on the control face for picked values (and both ends of a range).

## Answer

**Emitted values (output)**
- `date` / `date-range`: each end emits `YYYY-MM-DDT00:00:00Z` — fixed-zero UTC midnight, never timezone-converted on output.
- `datetime` / `datetime-range`: each end emits `YYYY-MM-DDThh:mm:ssZ` — the real UTC instant; picking a datetime means choosing both date and time.
- Fixed-width output, always with seconds (`:00` when unpicked), milliseconds truncated. Uniform width keeps `min`/`max` correct as plain lexicographic string comparisons.
- DST/ambiguous local times resolve natively per ECMAScript — fall-back repeats take the first occurrence, spring-forward gaps roll forward. Hand-rolling would require a timezone library, forbidden by this effort; the behavior is documented, not special-cased.

**Accepted inputs (`Initial` / `setValue`)**
- Strings only — no `Date` objects, no epoch numbers (callers call `.toISOString()` themselves).
- ISO whitelist, one universal interpretation rule: **a string without `Z` denotes local wall-clock time and is converted to the real UTC instant**; a string with `Z` is taken as-is; an explicit `±HH:MM` offset designates its own instant and normalizes to `Z`.
- Per-kind normalization of what comes in:
  - Bare `YYYY-MM-DD` into a `date` kind appends `T00:00:00Z` **verbatim** — the typed calendar date is the stored date on every machine (the original fixed-zero spec wins over the blanket no-Z rule for time-less strings).
  - Bare `YYYY-MM-DD` into a `datetime` kind counts as **local midnight** and converts like any pick.
  - A *timed* string (with or without zone) into a `date` kind is parsed to its instant; the UTC calendar date of that instant is taken and re-emitted fixed-zero — so a local-time string can land on an adjacent calendar day after conversion.
  - Any accepted input into a `datetime` kind re-emits the instant itself, fixed-width.
- Anything else (non-ISO, unparseable): dev-only console warning naming the Field; `setValue` is a no-op, an invalid `Initial` seeds nothing — matching the repo's existing warning-and-ignore patterns.

**Control-face display**
- `en-US` via `Intl.DateTimeFormat`, deliberately matching Table's column-renderer precedent.
- `date`: `Aug 26, 2026`. `datetime`: same plus short time. Range ends join with `" – "`; a half-set range shows the set end followed by a dash (e.g. `Aug 26, 2026 –`).

## Comments

- **Post-resolution amendment (human):** the blanket input rule was tightened after the ticket closed — all date-related fields accept ISO with/without `Z`, and any no-Z string means local time and converts to UTC `…Z`. This surfaced one conflict with the original fixed-zero spec (bare `YYYY-MM-DD` into date kinds); grilled and settled: bare dates append `T00:00:00Z` verbatim, only time-bearing strings convert. Answer above reflects the amended contract.
