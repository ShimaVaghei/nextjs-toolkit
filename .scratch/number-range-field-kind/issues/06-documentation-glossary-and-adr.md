# 06 - Documentation: glossary and a ADR

**What to build:** Record the feature's vocabulary and decisions in the project's documentation so future work speaks a shared language. The domain glossary's Field terms section records the terms introduced around this feature: Field, Field kind, Range value,and Number range field—plus Range swap. A short architecture-decision-record captures the design decisions drawn from the spec:the Range swap invariant (swap, never error)chosen for cross-kind consistency,and the decision to mirror the date-range normalization(always-carry-both-keys,undefined for missing)so emptiness stays consistently specified.

.,

**Blocked by:**: 02 - Commit pipeline (the swap-and-normalize behaviour being documented must already be settled.,

.,

**Status:** ready-for-agent

- [ ] Glossary records Field,Field kind,Range value,Range swap,and Number range field in the Field terms section
- [ ] An ADR captures the Range swap invariant,andthe always-both-keys normalization/emptiness decision
- [ ] Documentation uses the project's established vocabulary,and no file-specific implementation detail goes stale