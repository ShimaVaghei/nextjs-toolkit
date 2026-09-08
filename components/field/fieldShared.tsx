import type { JSX } from "react";

// ─── Public data types shared by the helpers ─────────────────────────

/**
 * One choice offered by a choice kind: a display label, an unbounded value
 * handed over when chosen, and an optional unselectable flag. Labels are the
 * only rendered surface; values participate only in Matching.
 */
export type FieldOption<T = unknown> = {
  label: string;
  value: T;
  disabled?: boolean;
};

/**
 * Where a choice kind's Options come from: a static array of `FieldOption`s
 * or an async loader fired once on mount and re-fired only by Retry.
 */
export type FieldOptionSource<T = unknown> =
  | FieldOption<T>[]
  | (() => Promise<FieldOption<T>[]>);

/**
 * The range value shape a number-range Field carries: two individually
 * optional numeric bounds. Mirrors the date-range shape (`{ from?, to? }`)
 * but numeric, so open-ended ranges are first-class and a range with no
 * bounds has each end simply absent.
 */
export type FieldNumberRangeValue = { from?: number; to?: number };

// ─── Tailwind CSS-token constants ────────────────────────────────────

export const LABEL_CLASS =
  "block text-sm font-medium text-neutral-900 dark:text-neutral-100";

export const CONTROL_CLASS =
  "mt-1.5 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 " +
  "text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

export const HINT_CLASS = "mt-1 text-sm text-neutral-500 dark:text-neutral-400";

export const ERROR_CLASS =
  "mt-1 text-sm font-semibold text-red-600 dark:text-red-400";

export const REJECTED_MESSAGE_CLASS = "text-red-600 dark:text-red-400";

export const RETRY_BUTTON_CLASS =
  "ml-2 rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium " +
  "text-red-600 cursor-pointer hover:bg-red-50 focus:outline-none " +
  "focus:ring-2 focus:ring-red-500/30 dark:border-red-900 dark:bg-transparent " +
  "dark:text-red-400 dark:hover:bg-red-950 dark:focus:ring-red-400/30";

/** Muted pure-Tailwind spinner for the Pending status line (same shape as Table's). */
export const OPTION_LOAD_SPINNER = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    className="inline-block h-3.5 w-3.5 animate-spin"
  >
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2"
    />
    <path
      d="M14 8a6 6 0 0 0-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
) as JSX.Element;

export const CHECKBOX_ROW_CLASS = "mt-1.5 flex items-center";

export const CHECKBOX_CLASS =
  "size-4 shrink-0 rounded border border-neutral-300 bg-white accent-neutral-900 " +
  "focus:outline-none focus:ring-2 focus:ring-neutral-500/30 disabled:cursor-not-allowed " +
  "disabled:bg-neutral-100 disabled:accent-neutral-400 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:accent-neutral-100 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800";

export const CHECKBOX_LABEL_CLASS =
  "ml-2 text-sm font-medium text-neutral-900 dark:text-neutral-100";

/**
 * Wrapping chip strip (Selection display `chips`): grows with the selection up
 * to about three rows, scrolling internally past that — no horizontal scrollbar.
 */
export const CHIP_STRIP_CLASS =
  "field-chip-strip flex max-h-24 min-h-11 min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-y-auto rounded-md border border-neutral-300 bg-white px-2 py-1 " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Text Selection display strip: one line of comma-joined labels inside the
 * same bordered control, clipped to a single row with an ellipsis. The whole
 * strip is the disclosure trigger (like the select kind's closed face).
 */
export const SELECTION_TEXT_STRIP_CLASS =
  "field-selection-text flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden rounded-md border border-neutral-300 bg-white px-3 py-1 text-left text-sm text-neutral-900 dark:text-neutral-100 " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/** The truncating text face itself; the full string rides the native title. */
export const SELECTION_TEXT_CLASS =
  "block min-w-0 flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100";

export const CHIP_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 py-0.5 pl-2.5 pr-0.5 " +
  "text-xs font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

export const CHIP_REMOVE_CLASS =
  "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 " +
  "hover:bg-neutral-300 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent " +
  "dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:hover:bg-transparent";

export const OPEN_BUTTON_CLASS =
  "flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center self-start rounded-md border border-neutral-300 bg-white " +
  "text-neutral-500 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 disabled:hover:bg-white " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800 dark:disabled:hover:bg-neutral-800";

export const PANEL_CLASS =
  "absolute left-0 right-0 top-full z-10 mt-1.5 space-y-3 rounded-md border border-neutral-300 bg-white p-3 shadow-md " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/** The Options popup's Clear footer button: muted, like the calendar's Cancel. */
export const OPTIONS_CLEAR_BUTTON_CLASS =
  "cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-neutral-600 " +
  "hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus:ring-neutral-400/30";

/** Shared layout of one toggleable multi-select row inside the Options popup; styled for parity with the select kind's rows. */
export const ROW_LABEL_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100";

/** Interactive affordances for an enabled row. */
export const ROW_LABEL_ENABLED_CLASS = " cursor-pointer hover:bg-neutral-100 focus-within:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-within:bg-neutral-800";

/**
 * Inert affordances for a disabled row — composed exclusively rather than
 * overridden, since a label never matches :disabled.
 */
export const ROW_LABEL_DISABLED_CLASS = " cursor-not-allowed opacity-60";

/** Closed-face trigger of the select disclosure; the whole face opens the shared Options popup. */
export const SELECT_TRIGGER_CLASS =
  "flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 " +
  "text-left text-sm text-neutral-900 shadow-sm " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

export const SELECT_FACE_GHOST_CLASS = "text-neutral-400 dark:text-neutral-500";

/** One pickable select row inside the Options popup; disabled Options render inert. */
export const ROW_BUTTON_CLASS =
  "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-900 " +
  "hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent " +
  "dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800 " +
  "dark:disabled:hover:bg-transparent";

// ─── Matching & option types ─────────────────────────────────────────

/**
 * Matching ties a held value to an Option: reference identity by default, or
 * the config's matchValue override — applied identically at every decision
 * point (closed face, popup checkbox states, chip membership, staleness).
 */
export type MatchFn = (a: unknown, b: unknown) => boolean;

export const IDENTITY_MATCH: MatchFn = Object.is;

/** String and number Fallbacks render their string form; anything else cannot. */
function isRenderablePrimitive(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

const UNKNOWN_OPTION_LABEL = "(unknown option)";

/** The rendered surface of a value that Matches no Option. */
function fallbackLabel(value: unknown): string {
  return isRenderablePrimitive(value)
    ? String(value)
    : UNKNOWN_OPTION_LABEL;
}

/** Dev-warning description of an unmatched value; objects are never stringified. */
export function describedStaleValue(value: unknown): string {
  return isRenderablePrimitive(value)
    ? `"${String(value)}"`
    : "(non-primitive value)";
}

// ─── Chip identity ───────────────────────────────────────────────────

/**
 * Stable cross-render Chip identity for unbounded values, which cannot key
 * React trees or ref maps directly. Objects and functions get a monotonically
 * increasing id in a module-level WeakMap — stable for the value's lifetime,
 * collectable afterwards; primitives get their type prefixed to their string
 * form so lookalikes never collide. Surviving Chips keep their DOM nodes
 * across removals, which the focus hop relies on.
 */
const objectChipIds = new WeakMap<object, number>();
let nextObjectChipId = 0;

export function chipIdFor(value: unknown): string {
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function")
  ) {
    let id = objectChipIds.get(value);
    if (id === undefined) {
      id = ++nextObjectChipId;
      objectChipIds.set(value, id);
    }
    return `object-${id}`;
  }
  return `${typeof value}-${String(value)}`;
}

/** One rendered Chip: a matched Option, or a Fallback for an unmatched or demoted selection. */
export type Chip = {
  kind: "option" | "fallback";
  /** Stable cross-render identity backing React keys and focus-hop lookups. */
  key: string;
  label: string;
  value: unknown;
};

/**
 * Resolves the rendered Chips for a multi-select in Options order. Held
 * disabled Options are demoted to label-bearing fallbacks by
 * keepDisabledSelection; values Matching no Option are appended as fallback
 * Chips (their string form for primitives, "(unknown option)" otherwise).
 * While Options are not yet authoritative (a load is Pending or Rejected)
 * held selections stay visible without being reported stale.
 */
export function resolveChips(
  options: FieldOption[],
  values: unknown[],
  matches: MatchFn,
  keepDisabledSelection: boolean,
  optionsAuthoritative: boolean,
): { entries: Chip[]; staleValues: unknown[] } {
  const chips: Chip[] = [];
  // Which held values Match some Option — computed once, reused by both the
  // staleness report and the fallback-Chip pass below.
  const matchesAnOption = values.map((value) =>
    options.some((option) => matches(option.value, value)),
  );
  for (const option of options) {
    const heldIndex = values.findIndex((value) =>
      matches(option.value, value),
    );
    if (heldIndex === -1) {
      continue;
    }
    chips.push(
      option.disabled && !keepDisabledSelection
        ? {
            kind: "fallback",
            key: chipIdFor(option.value),
            label: option.label,
            value: option.value,
          }
        : {
            kind: "option",
            key: chipIdFor(option.value),
            label: option.label,
            value: option.value,
          },
    );
  }
  const staleValues = optionsAuthoritative
    ? values.filter((_, index) => !matchesAnOption[index])
    : [];
  values.forEach((value, index) => {
    if (!matchesAnOption[index]) {
      chips.push({
        kind: "fallback",
        key: chipIdFor(value),
        label: fallbackLabel(value),
        value,
      });
    }
  });
  return { entries: chips, staleValues };
}

// ─── Select face resolution ──────────────────────────────────────────

/**
 * What the closed face of a select renders for its current value: the ghost while
 * Empty, the matched Option's label (a held disabled Option stays legal under
 * keepDisabledSelection), or the Fallback — a demoted Option still renders its
 * label; an unmatched primitive renders its string form and an unmatched
 * non-primitive renders "(unknown option)". While Options are not yet
 * authoritative (a load is Pending or Rejected) a held selection is
 * expected-absent rather than stale: it still renders as a fallback face so it
 * stays visible, but no staleness is reported.
 */
export type SelectFace =
  | { kind: "ghost" }
  | { kind: "option"; option: FieldOption }
  | { kind: "fallback"; label: string; value: unknown };

export function resolveSelectFace(
  options: FieldOption[],
  value: unknown,
  matches: MatchFn,
  keepDisabledSelection: boolean,
  optionsAuthoritative: boolean,
): { face: SelectFace; isStale: boolean } {
  if (value === undefined || value === null || value === "") {
    return { face: { kind: "ghost" }, isStale: false };
  }
  const matched = options.find((option) => matches(option.value, value));
  const isStale = optionsAuthoritative && matched === undefined;
  const face: SelectFace =
    matched && (!matched.disabled || keepDisabledSelection)
      ? { kind: "option", option: matched }
      : matched
        ? { kind: "fallback", label: matched.label, value: matched.value }
        : { kind: "fallback", label: fallbackLabel(value), value };
  return { face, isStale };
}

// ─── Option load lifecycle ───────────────────────────────────────────

/** Lifecycle of an async Option load; only meaningful when `options` is a loader. */
export type OptionLoadStatus = "pending" | "resolved" | "rejected";

// ─── Seed-once comparison ────────────────────────────────────────────

/**
 * Seed-once comparison: Matching-aware identity — Object.is unless the
 * config overrides it — with a shallow elementwise pass for arrays so a
 * re-created-but-equal literal (the common multi-select call site, including
 * object-valued Options under a matchValue) does not read as a changed
 * Initial value.
 */
export function sameInitial(a: unknown, b: unknown, matches: MatchFn): boolean {
  // Absent Initial values are not values — they seed nothing, so they never
  // reach the matcher, whose contract assumes its domain shape (an
  // object-keyed override would throw on undefined). No-seed vs no-seed is
  // quiet; no-seed vs a seed counts as a changed Initial.
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (matches(a, b)) {
    return true;
  }
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((seed, index) => matches(seed, b[index]))
  );
}

// ─── Options loader guard ────────────────────────────────────────────

export function isOptionsLoader(
  options: unknown,
): options is () => Promise<FieldOption[]> {
  return typeof options === "function";
}

// ─── Number-input coercion ───────────────────────────────────────────

/**
 * Number-input coercion: non-empty parseable → Number(raw); empty or
 * whitespace-only → ""; non-empty garbage → NaN (counts as Empty at runtime).
 */
export function coerceNumberInput(raw: string): string | number {
  return raw.trim() === "" ? "" : Number(raw);
}

/**
 * Number-range end coercion (the plural of the number-input matrix, applied
 * to one bound at a time): blank or whitespace-only raw input becomes the
 * absent end (`undefined`), anything else maps through `Number` so non-numeric
 * garbage becomes NaN — which the emptiness predicate reads as a missing
 * bound at validation time.
 */
export function coerceNumberRangeEnd(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  return Number(trimmed);
}

/**
 * The number-range commit normalizer: the ends arrive already coerced by the
 * caller, so the only transform here is the range swap invariant — when both
 * bounds are present and `from > to`, they are swapped so `from <= to` always
 * holds. Matches the date-range kinds exactly; never an ordering error. NaN
 * compares false, so a garbage end never triggers a swap.
 */
export function normalizeNumberRange(
  value: FieldNumberRangeValue,
): FieldNumberRangeValue {
  const { from, to } = value;
  if (from !== undefined && to !== undefined && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}
