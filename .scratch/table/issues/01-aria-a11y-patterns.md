# 01 — ARIA & a11y patterns for sortable/paginated tables

Type: research
Status: claimed
Blocked by: None

## Question

What ARIA roles, states, and patterns should the `Table` component use for: sortable column headers, filter controls (inputs/selects per column), and pagination controls? What does an accessible pattern for a sortable table header look like (`aria-sort`, button-in-th), and what are the screen-reader expectations for filter and pagination affordances?

Resolve by a `/research` subagent against high-trust primary sources (WAI-ARIA Authoring Practices, MDN, WCAG). Capture findings on a throwaway `research/<name>` branch with a context pointer from this ticket. Feed the concrete attribute/role list to the rendering (02) and build (06) tickets.