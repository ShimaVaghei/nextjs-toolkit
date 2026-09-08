# 01 — Modal scaffolding, controlled rendering, and closes

**What to build:** The Modal exists as a module and renders its foundation end-to-end. When `open` is false it renders nothing; when `open` it renders a portaled, centered dialog with a visible title, a translucent backdrop, sticky header and footer, and a body region. It is fully controlled by the parent. Cancel button, Escape press, and backdrop click each call the single `onClose` callback. While open, body scroll is locked and restored on close, and focus moves to the panel.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Renders nothing from the DOM when `open` is `false`.
- [ ] Renders a portaled dialog with `role="dialog"`, `aria-modal`, and `aria-label={title}` when `open`.
- [ ] The `title` prop renders as the visible heading.
- [ ] The Cancel button, an Escape keypress, and a backdrop click each call `onClose`.
- [ ] Body scroll is locked while open and restored on close.
- [ ] A harness can close the Modal from the parent (flip `open` to `false`) and it unmounts.
- [ ] Tests cover all of the above (single component seam).