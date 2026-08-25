# 03 — Email becomes a rule, not an input type

**What to build:** Email format checking moves into the declarative Validator. A form builder writes `email: true` (or a `{ value, message }` pair for custom copy) on an input Field instead of setting an email Input type and hand-writing a regex. The Input type narrows to text/password/number, and the demo page swaps its hand-written pattern for the rule.

**Blocked by:** 01 — Prefactor: prefix all exported Field types; 02 — Field owns its value.

**Status:** ready-for-human

- [x] InputType accepts only `"text" | "password" | "number"`; the email flavor is gone
- [x] The Validator accepts `email` as bare boolean or `{ value, message }`; bare form uses default message "Enter a valid email address."
- [x] The rule fits non-number inputs only; attaching it elsewhere draws the existing dev-only warning naming the Field
- [x] Fixed precedence holds: evaluated after maxLength, before regex; first violation wins
- [x] Required still short-circuits ahead of it for Empty values
- [x] Demo page validates its email field via the rule with no custom regex; suite covers fit, custom message, and precedence
