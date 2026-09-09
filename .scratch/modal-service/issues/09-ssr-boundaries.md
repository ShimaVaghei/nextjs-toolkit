# 09 — SSR & client-boundary placement

Type: research
Status: resolved

## Question

Where do the client boundaries sit in Next.js App Router? The service is inherently client-side ("use client" — DOM, portals). Sub-questions:

- Is the singleton module `"use client"` so importing it from a server component errors clearly rather than silently breaking?
- `<ModalHost />` in the root layout: does the layout stay a server component with a client host leaf?

- Anything to know about hydration/StrictMode double-mount affecting the stack state?

Capture findings as constraints for the spec. No implementation.

## Answer

Grounded in the Next.js docs (Server and Client Components / composition patterns, `use client` reference).

**1. Mark the singleton module `"use client"` — yes.**
- `"use client"` declares a module-graph boundary: everything imported by a client module is part of the client bundle. The singleton store (`open()`/`close()` + modal stack) is inherently client-side (DOM portals, events), so mark it `"use client"`.
- What happens if a Server Component imports it: importing is **allowed** (client modules are importable from server components as client references), but the imported values are opaque client references, not real functions. Calling `open()` from a server component fails at runtime rather than working — which surfaces the bug, but late and confusingly.
- For a *clear, early* error, follow the docs' "preventing environment poisoning" pattern mirrored on the client side: add the `client-only` package as a side-effect import in the singleton module. Next.js intercepts these imports and produces a build-time error if the module is evaluated in a server environment. (Installing `client-only` is optional per docs; Next.js handles the import internally.)
- Constraint for spec: the singleton must never be called at module top-level during render; `open()` is only legal inside client components / event handlers / client-side effects.

**2. Root layout stays a Server Component with `<ModalHost />` as a client leaf — yes.**
- This is the documented "moving Client Components to the leaves" pattern: keep layouts/pages server, and push the client boundary as deep as possible. A client component embedded in a server layout is fully supported; server components can render client components as children/props without restriction.
- `<ModalHost />` renders nothing when the stack is empty, so the server-rendered HTML for it is empty and the client hydrates to the same empty state — no boundary friction.
- Constraint for spec: do **not** make `app/layout.tsx` a client component just to host modals; the only change to the layout is rendering `<ModalHost />` (optionally accepting it via `children`-style props to keep the layout reusable).

**3. Hydration / StrictMode — three specific concerns:**
- **SSR output**: the server never sees `open()` calls, so the store is always empty at hydration. The modal stack must therefore live only on the client (`typeof window !== "undefined"` guard or just rely on "use client" + effects). Hydration is safe because ModalHost renders the same empty tree on server and client. Any modal open state is lost on a full page load/navigation from the server — that's expected and must be documented as a limitation (modals don't survive SSR navigation; use intercepting routes if URL-driven modals are ever needed).
- **React StrictMode (dev only)**: effects mount → unmount → remount. If `open()` is ever called from an effect, it will fire twice. Constraint: modal-opening flows must be idempotent or driven by user events (click handlers), not mount effects. If an effect must open a modal, cleanup must close it so the double-invoke doesn't stack duplicates.
- **Dev HMR / Fast Refresh**: module-level state can be reset or duplicated when the singleton module is edited, since Fast Refresh re-evaluates modules. This is dev-only noise, not a prod issue; keep the store trivially re-initializable (stateless-defaults) so a reset is harmless.
- Constraint for spec: no modal state may be rendered during initial SSR; the stack starts empty and only mutates post-hydration.

**Summary constraints for the spec:**
1. Singleton store module: `"use client"` + `import "client-only"` for a clear build error if touched from the server graph.
2. `open()` callable only from client code (event handlers/effects); never during server render.
3. Root layout remains a server component; `<ModalHost />` is the sole client leaf it adds, rendering null when idle.
4. Modal stack is client-only, starts empty on hydration; modals are not SSR-persistent state.
5. StrictMode/HMR: avoid `open()` in effects, or pair with cleanup; stack state must tolerate module re-evaluation in dev.

