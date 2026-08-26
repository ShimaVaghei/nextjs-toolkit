Type: grilling
Status: resolved

## Question

The Serialization contract fixed the display format as en-US `Intl.DateTimeFormat` "matching Table's column-renderer precedent" (`components/Table.tsx` already owns formatters and a date-only regex). Should the date formatting/parsing helpers be extracted into a shared module consumed by both Table columns and the new Field kinds, or does Table keep its private copies? Decide on coupling vs duplication grounds, including where such a module would live if shared.

## Answer

- **Extract, don't duplicate.** The format match is a recorded cross-component contract (ticket 02: "en-US Intl matching Table"); with private copies nothing enforces it and drift is silent. Making the contract structural beats hoping comments stay true, and the cost is ~10 lines.
- **What's shared — only the genuine overlap:** the two display formatters and the bare-date pattern (`/^\d{4}-\d{2}-\d{2}$/`, which Field also needs for decision 02's "bare dates append `T00:00:00Z` verbatim" rule). Table's parse/match machinery (`toDate`, `toMatchDate`, `sameDateParts`, `<time>` attribute building) stays private: its lenient parse-for-render/filter semantics are fundamentally different from Field's strict ISO serialization contract, so sharing would couple unrelated behavior.
- **Where:** `lib/date-formats.ts` (lib/ is the established home for non-component modules) exporting `DATE_DISPLAY_FORMAT`, `DATETIME_DISPLAY_FORMAT`, and `DATE_ONLY_PATTERN`. Renaming away from Table's generic `DATE_FORMAT`/`DATETIME_FORMAT` marks them as the shared display contract rather than Table internals.
- **Migration:** Table imports all three and deletes its private copies — behavior identical, existing tests stay green. Field consumption lands with the implementation tickets (Date & datetime fields; Range fields); no Field logic changes hands here.
