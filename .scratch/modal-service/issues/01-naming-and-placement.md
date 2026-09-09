# 01 — Naming & module placement

Type: grilling
Status: open

## Question

What is the feature called, and where does it live? Candidates:

- "Modal service" (user's working name) vs "Modal manager" vs "Modal controller".
- File placement: `components/modal/service/`, `lib/modalService.ts`, or a sibling `components/modal-service/`?
- What terms enter `CONTEXT.md` (the map, host, open function, per-modal open functions)?

Avoid-list in CONTEXT.md forbids "popup/dialog box" for Modal — the service naming must not collide with the existing Modal/ModalConfig/Apply/Cancel terms.
