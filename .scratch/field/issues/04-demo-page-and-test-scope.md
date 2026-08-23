# Demo page and test scope

Type: grilling
Status: open

## Question

Two scope decisions before building:

1. Does Field get a demo page at `app/field/` mirroring `app/table/local|server` — one page, or split static-options vs async-options demos?
2. Which behaviors must the vitest suite pin down as a minimum contract: number coercion matrix, touched lifecycle (silent → blur → change), async options pending/resolved/rejected, `handle.validate()` force-run, `onErrorChange` firing, multi-select toggle semantics?
