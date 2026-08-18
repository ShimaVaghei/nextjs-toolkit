# 04 — Sort interaction & local-mode semantics

Type: grilling
Status: open
Blocked by: None

## Question

How does sorting behave in both modes?

- Header interaction: click cycles asc → desc → none? Indicator (`aria-sort`, arrow icon)?
- `sortable: string` as the request key; what happens to client-side sorting when a custom sort key is given (no matching local property)?
- Local-mode ordering rules: default comparator (string vs number vs date per `type`), case sensitivity, and how `transform` interacts with sorting.

Work via `/grilling` (and `/prototype` if a rough take helps). Record the decision; block the build (06) on it.