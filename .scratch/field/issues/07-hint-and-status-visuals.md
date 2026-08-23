# Hint and status visuals

Type: prototype
Status: resolved

## Question

Cheap visual pass over the Field's text furniture before implementation builds it for real: hint line, validation Error line, Pending ("Loading options…"), and Rejected + Retry line — tone, weight, spacing, dark-mode variants, per [Select presentation policies](01-select-presentation-policies.md)' shared status-line contract.

Key question: does muted-neutral-for-Pending / destructive-tone-but-not-Error-slot-for-Rejected actually read correctly next to a real validation Error? React via `/prototype` variants; link the artifact here; fold the verdict into the implementation ticket.

## Comments

- Claimed 2026-08-23 (agent session). Prototype built at `app/field-status-prototype/page.tsx` (uncommitted on `field`; will be captured to a throwaway branch with the verdict): `pnpm dev` → http://localhost:3000/field-status-prototype — three variants (`?variant=` or the ← → bar): **A** canonical stack (statuses in the hint slot above the control), **B** feedback rail (everything below, compact), **C** callout strips (statuses hug the control, Error as left-bar callout). All variants keep the locked a11y DOM (persistent hint-slot `<p>`, always-mounted polite error `<p>`, stable `describedby`). Retry is live — it re-fails after ~1.5s so Rejected stays inspectable. Verdict pending human review.

## Answer

Resolved 2026-08-23. Prototype: `app/field-status-prototype/page.tsx`, captured on branch `research/field-status-visuals` (route `/field-status-prototype`, three variants via `?variant=`), reviewed live in light and dark by the owner.

**Winner: Variant B — single feedback rail.** Hint, Pending, Rejected+Retry, and Error all stack *below* the control as compact text-xs lines: muted-neutral Pending with a spinner; Rejected in red-700 / dark red-300 with a small bordered Retry chip; Error semibold red-600 with the sr-only "Error:" prefix inside its always-mounted polite node.

Owner amendment to B: **widen the label→control gap** — controls sit `mt-1.5` under the label; rail lines stay tight (`space-y-0.5`).

Key question answered: **yes** — muted-neutral Pending reads as transient, and destructive-tone Rejected outside the error slot stays distinct from a real validation Error beside it (the Retry affordance does most of the differentiating work). Dark-mode variants hold for all tones.

Fold-forward notes for implementation (map ends at decisions; no live implementation ticket): statuses render inside the persistent hint-slot `<p>` (content swaps, node never unmounts); error `<p>` separate and always mounted per [Accessibility and DOM contract](03-accessibility-dom-contract.md); spinner is a pure-Tailwind `animate-spin` disc; no external assets.
