# 01 — Introduce FieldOptionSource and refactor FieldChoiceConfig to use it

**What to build:** The shared "where Options come from" vocabulary exists beside FieldOption in the Field's shared vocabulary module: a static array of Options or an async loader. The Field choice configs' inline options union is replaced by it, and it is exported from the Field's public surface for the Table to consume. This is a pure prefactor — no behavior change anywhere.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `FieldOptionSource<T>` (Options array or async loader) is defined in the Field's shared vocabulary and exported publicly
- [x] `FieldChoiceConfig<T>.options` uses the shared type; select and multi-select behavior unchanged
- [x] The Table can import the type from the Field's public surface
- [x] Existing Field tests pass unmodified; typecheck and full suite green
