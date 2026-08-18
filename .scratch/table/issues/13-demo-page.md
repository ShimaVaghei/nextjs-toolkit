# 13 — Demo page

**What to build:** A demo page proving the feature in the running app. It renders two `Table` instances against a small mock dataset — one in server mode (a mock async `dataSource` honoring pagination/sort/filter) and one in local mode — exercising a representative mix of column types so rendering, filtering, sorting, pagination, and server lifecycle are all visibly working.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] The page renders a server-mode instance whose mock `dataSource` honors pagination, sort, and filters, and a local-mode instance over a small in-memory dataset.
- [ ] The mock data covers a representative mix of column types (at minimum text, date/datetime, array, image, number) and enough rows to paginate.
- [ ] Both instances are interactive in the running app: paginate, sort, filter, and recover from the server-mode loading/error paths.