Type: grilling
Status: open

## Question

The Serialization contract fixed the display format as en-US `Intl.DateTimeFormat` "matching Table's column-renderer precedent" (`components/Table.tsx` already owns formatters and a date-only regex). Should the date formatting/parsing helpers be extracted into a shared module consumed by both Table columns and the new Field kinds, or does Table keep its private copies? Decide on coupling vs duplication grounds, including where such a module would live if shared.
