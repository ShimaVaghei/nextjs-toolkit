"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactNode, Ref, RefObject } from "react";

type FieldKind =
  | "input"
  | "textarea"
  | "checkbox"
  | "select"
  | "multi-select";
export type FieldInputType = "text" | "password" | "number";

/**
 * How a multi-select Field renders its selected Options inside the control:
 * `chips` lays out one removable Chip per selection in a wrapping strip;
 * `text` joins the labels into one comma-separated line that truncates with
 * an ellipsis, the whole string riding the native tooltip.
 */
export type FieldSelectionDisplay = "chips" | "text";

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

export type FieldValue = string | number | boolean | string[];

/**
 * The value shape each Field kind carries: what Initial seeds, the observer
 * emits, and the Handle reads and installs. Choice kinds take it from the
 * config's T; the rest is fixed.
 */
type FieldValueOf<K extends FieldKind, T> = [K] extends ["select"]
  ? T
  : [K] extends ["multi-select"]
    ? T[]
    : [K] extends ["checkbox"]
      ? boolean
      : [K] extends ["textarea"]
        ? string
        : string | number;

export type FieldRequiredRule = boolean | { value: boolean; message: string };
export type FieldMinRule = number | { value: number; message: string };
export type FieldMaxRule = number | { value: number; message: string };
export type FieldMinLengthRule = number | { value: number; message: string };
export type FieldMaxLengthRule = number | { value: number; message: string };
export type FieldEmailRule = boolean | { value: boolean; message: string };
export type FieldRegexRule = RegExp | { value: RegExp; message: string };

export type FieldValidator = {
  required?: FieldRequiredRule;
  min?: FieldMinRule;
  max?: FieldMaxRule;
  minLength?: FieldMinLengthRule;
  maxLength?: FieldMaxLengthRule;
  email?: FieldEmailRule;
  regex?: FieldRegexRule;
};

/**
 * The config props every Field kind shares: identity, the value pipeline
 * (Initial seed plus observer), validation, and presentation. V is the
 * kind's value shape.
 */
type FieldCommonConfig<V> = {
  label: string;
  /**
   * Optional mount-time seed: read exactly once when the Field mounts, then
   * ignored — undefined seeds nothing. A changed prop after mount draws a
   * dev-only warning; live control flows only through user edits, setValue,
   * and onValueChange observation.
   */
  initialValue?: NoInfer<V>;
  /** Optional observer: fired for every committed change, however caused. */
  onValueChange?: (value: NoInfer<V>) => void;
  validator?: FieldValidator;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * The config props only the choice kinds (select, multi-select) consume:
 * where Options come from and how values Match against them.
 */
type FieldChoiceConfig<T> = {
  /** A static array or an async loader fired once on mount and re-fired only by Retry. */
  options?: FieldOption<T>[] | (() => Promise<FieldOption<T>[]>);
  /**
   * Matching override: replaces Object.is reference identity everywhere
   * consistently — closed-face resolution, popup checkbox states, chip
   * membership, and staleness detection. `a` is an Option's value, `b` the
   * held value.
   */
  matchValue?: (a: T, b: T) => boolean;
  /**
   * Whether a held currently-selected-but-disabled Option stays legally
   * selected (default true); false demotes it to the raw-value fallback.
   */
  keepDisabledSelection?: boolean;
};

/**
 * Muted hint text a Field shows while it holds nothing: the native attribute
 * on input and textarea kinds, the closed-face text on select, the empty
 * chip strip's text on multi-select. Checkbox has none. Purely visual —
 * inert, aria-hidden, never part of the value pipeline.
 */
type FieldPlaceholderConfig = {
  placeholder?: string;
};

/**
 * Internal superset the shared Field component reads from, generic over the
 * Field kind: K picks the value shape (input → string | number,
 * textarea → string, checkbox → boolean) and T is the Option value type the
 * choice kinds (select → T, multi-select → T[]) carry through Initial, the
 * observer, and the Handle. Composed from the same building blocks as the
 * public per-kind configs, plus the props individual kinds add; each wrapper
 * component stamps its own literal kind and exposes a kindless alias
 * (FieldInputConfig, FieldSelectConfig<T>, …), so no config a caller writes
 * ever carries a `kind`.
 */
type FieldConfig<K extends FieldKind = "input", T = unknown> =
  FieldCommonConfig<FieldValueOf<K, T>> &
    FieldChoiceConfig<T> &
    FieldPlaceholderConfig & {
      /** Stamped by the per-kind wrapper components; never set by callers. */
      kind?: K;
      inputType?: FieldInputType;
      selectionDisplay?: FieldSelectionDisplay;
    };

/**
 * The imperative handle a parent obtains from Field via the ref prop,
 * carrying the kind's narrowed value shape. Method syntax keeps handles
 * mutually assignable across differently-narrowed instantiations, so refs
 * flow through harnesses and callbacks without variance friction.
 */
export type FieldHandle<V = FieldValue> = {
  validate(): boolean;
  getValue(): V | undefined;
  setValue(value: V): void;
};

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";
const DEFAULT_MIN_MESSAGE = (min: number) => `Must be ${min} or greater.`;
const DEFAULT_MAX_MESSAGE = (max: number) => `Must be ${max} or less.`;
const DEFAULT_MIN_LENGTH_MESSAGE = (minLength: number) =>
  `Must be at least ${minLength} characters.`;
const DEFAULT_MAX_LENGTH_MESSAGE = (maxLength: number) =>
  `Must be at most ${maxLength} characters.`;
const DEFAULT_EMAIL_MESSAGE = "Enter a valid email address.";
const DEFAULT_REGEX_MESSAGE = "Invalid format.";

/** The demo page's long-standing hand-written baseline, promoted to the built-in. */
const DEFAULT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABEL_CLASS =
  "block text-sm font-medium text-neutral-900 dark:text-neutral-100";

const CONTROL_CLASS =
  "mt-1.5 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 " +
  "text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

const HINT_CLASS = "mt-1 text-sm text-neutral-500 dark:text-neutral-400";

const ERROR_CLASS =
  "mt-1 text-sm font-semibold text-red-600 dark:text-red-400";

const REJECTED_MESSAGE_CLASS = "text-red-600 dark:text-red-400";

const RETRY_BUTTON_CLASS =
  "ml-2 rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium " +
  "text-red-600 cursor-pointer hover:bg-red-50 focus:outline-none " +
  "focus:ring-2 focus:ring-red-500/30 dark:border-red-900 dark:bg-transparent " +
  "dark:text-red-400 dark:hover:bg-red-950 dark:focus:ring-red-400/30";

/** Muted pure-Tailwind spinner for the Pending status line (same shape as Table's). */
const OPTION_LOAD_SPINNER = (
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
);

const CHECKBOX_ROW_CLASS = "mt-1.5 flex items-center";

const CHECKBOX_CLASS =
  "size-4 shrink-0 rounded border border-neutral-300 bg-white accent-neutral-900 " +
  "focus:outline-none focus:ring-2 focus:ring-neutral-500/30 disabled:cursor-not-allowed " +
  "disabled:bg-neutral-100 disabled:accent-neutral-400 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:accent-neutral-100 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800";

const CHECKBOX_LABEL_CLASS =
  "ml-2 text-sm font-medium text-neutral-900 dark:text-neutral-100";

/**
 * Wrapping chip strip (Selection display `chips`): grows with the selection up
 * to about three rows, scrolling internally past that — no horizontal scrollbar.
 */
const CHIP_STRIP_CLASS =
  "field-chip-strip flex max-h-24 min-h-11 min-w-0 flex-1 flex-wrap content-start items-center gap-1.5 overflow-y-auto rounded-md border border-neutral-300 bg-white px-2 py-1 " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Text Selection display strip: one line of comma-joined labels inside the
 * same bordered control, clipped to a single row with an ellipsis.
 */
const SELECTION_TEXT_STRIP_CLASS =
  "field-selection-text flex min-h-11 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-neutral-300 bg-white px-2 py-1 " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/** The truncating text face itself; the full string rides the native title. */
const SELECTION_TEXT_CLASS =
  "block w-full truncate text-sm text-neutral-900 dark:text-neutral-100";

const CHIP_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 py-0.5 pl-2.5 pr-0.5 " +
  "text-xs font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

const CHIP_REMOVE_CLASS =
  "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 " +
  "hover:bg-neutral-300 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent " +
  "dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:hover:bg-transparent";

const OPEN_BUTTON_CLASS =
  "flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-neutral-300 bg-white " +
  "text-neutral-500 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 disabled:hover:bg-white " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800 dark:disabled:hover:bg-neutral-800";

const PANEL_CLASS =
  "absolute left-0 right-0 top-full z-10 mt-1.5 space-y-3 rounded-md border border-neutral-300 bg-white p-3 shadow-md " +
  "dark:border-neutral-700 dark:bg-neutral-900";

/** Shared layout of one toggleable multi-select row inside the Options popup; styled for parity with the select kind's rows. */
const ROW_LABEL_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100";

/** Interactive affordances for an enabled row. */
const ROW_LABEL_ENABLED_CLASS = " cursor-pointer hover:bg-neutral-100 focus-within:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-within:bg-neutral-800";

/**
 * Inert affordances for a disabled row — composed exclusively rather than
 * overridden, since a label never matches :disabled.
 */
const ROW_LABEL_DISABLED_CLASS = " cursor-not-allowed opacity-60";

/** Closed-face trigger of the select disclosure; the whole face opens the shared Options popup. */
const SELECT_TRIGGER_CLASS =
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 " +
  "text-left text-sm text-neutral-900 shadow-sm " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

const SELECT_FACE_GHOST_CLASS = "text-neutral-400 dark:text-neutral-500";

/** One pickable select row inside the Options popup; disabled Options render inert. */
const ROW_BUTTON_CLASS =
  "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-900 " +
  "hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent " +
  "dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800 " +
  "dark:disabled:hover:bg-transparent";

type Constraint<T> = T | { value: T; message: string };

function isConstraintPair<T>(
  rule: Constraint<T>,
): rule is { value: T; message: string } {
  return (
    typeof rule === "object" &&
    rule !== null &&
    "value" in rule &&
    "message" in rule
  );
}

/** A rule accepts a bare constraint (built-in default copy) or a { value, message } pair. */
function unpack<T>(
  rule: Constraint<T>,
  defaultMessage: (value: T) => string,
): { value: T; message: string } {
  return isConstraintPair(rule)
    ? { value: rule.value, message: rule.message }
    : { value: rule, message: defaultMessage(rule) };
}

function requiredConstraint(
  rule: NonNullable<FieldValidator["required"]>,
): { isRequired: boolean; message: string } {
  const { value, message } = unpack(rule, () => DEFAULT_REQUIRED_MESSAGE);
  return { isRequired: value, message };
}

function isNumberInput(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "input" && inputType === "number";
}

/**
 * Number-input coercion: non-empty parseable → Number(raw); empty or
 * whitespace-only → ""; non-empty garbage → NaN (counts as Empty at runtime).
 */
function coerceNumberInput(raw: string): FieldValue {
  return raw.trim() === "" ? "" : Number(raw);
}

/**
 * Matching ties a held value to an Option: reference identity by default, or
 * the config's matchValue override — applied identically at every decision
 * point (closed face, popup checkbox states, chip membership, staleness).
 */
type MatchFn = (a: unknown, b: unknown) => boolean;

const IDENTITY_MATCH: MatchFn = Object.is;

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
function describedStaleValue(value: unknown): string {
  return isRenderablePrimitive(value)
    ? `"${String(value)}"`
    : "(non-primitive value)";
}

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

function chipIdFor(value: unknown): string {
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
type Chip = {
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
function resolveChips(
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

/**
 * What the closed face of a select renders for its current value for its current value: the ghost while
 * Empty, the matched Option's label (a held disabled Option stays legal under
 * keepDisabledSelection), or the Fallback — a demoted Option still renders its
 * label; an unmatched primitive renders its string form and an unmatched
 * non-primitive renders "(unknown option)". While Options are not yet
 * authoritative (a load is Pending or Rejected) a held selection is
 * expected-absent rather than stale: it still renders as a fallback face so it
 * stays visible, but no staleness is reported.
 */
type SelectFace =
  | { kind: "ghost" }
  | { kind: "option"; option: FieldOption }
  | { kind: "fallback"; label: string; value: unknown };

function resolveSelectFace(
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

/** Lifecycle of an async Option load; only meaningful when `options` is a loader. */
type OptionLoadStatus = "pending" | "resolved" | "rejected";

/**
 * Seed-once comparison: Matching-aware identity — Object.is unless the
 * config overrides it — with a shallow elementwise pass for arrays so a
 * re-created-but-equal literal (the common multi-select call site, including
 * object-valued Options under a matchValue) does not read as a changed
 * Initial value.
 */
function sameInitial(a: unknown, b: unknown, matches: MatchFn): boolean {
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

function isOptionsLoader(
  options: unknown,
): options is () => Promise<FieldOption[]> {
  return typeof options === "function";
}

/** Textual rules fit textarea and non-number inputs — never a checkbox. */
function fitsTextualRules(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "textarea" || (kind === "input" && !isNumberInput(kind, inputType));
}

/** The email rule fits non-number inputs only — never a number input or textarea. */
function fitsEmailRule(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "input" && !isNumberInput(kind, inputType);
}

type RuleName = keyof FieldValidator;

const RULE_NAMES: RuleName[] = [
  "required",
  "min",
  "max",
  "minLength",
  "maxLength",
  "email",
  "regex",
];

function ruleFits(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
  name: RuleName,
): boolean {
  switch (name) {
    case "required":
      return true;
    case "min":
    case "max":
      return isNumberInput(kind, inputType);
    case "minLength":
    case "maxLength":
      return fitsTextualRules(kind, inputType);
    case "email":
      return fitsEmailRule(kind, inputType);
    case "regex":
      return fitsTextualRules(kind, inputType);
  }
}

/**
 * Empty semantics: null/undefined/"" everywhere, whitespace-only for textual
 * kinds (trimmed for testing only), NaN on number inputs at runtime, and
 * `false` for checkbox — required means must-tick (the consent pattern).
 * Anything else a choice kind can hold (objects, non-empty arrays) is never
 * Empty.
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  if (typeof value === "boolean") {
    return value === false;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

/** Runs the applicable rules in fixed precedence; the first violation wins. */
function evaluate(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
  validator: FieldValidator | undefined,
  value: unknown,
): string | null {
  if (!validator) {
    return null;
  }

  if (validator.required !== undefined) {
    const { isRequired, message } = requiredConstraint(validator.required);
    if (isRequired && isEmpty(value)) {
      return message;
    }
  }

  const numericValue =
    typeof value === "number" && !Number.isNaN(value) ? value : null;

  if (
    validator.min !== undefined &&
    isNumberInput(kind, inputType) &&
    numericValue !== null
  ) {
    const { value: min, message } = unpack(validator.min, DEFAULT_MIN_MESSAGE);
    if (numericValue < min) {
      return message;
    }
  }

  if (
    validator.max !== undefined &&
    isNumberInput(kind, inputType) &&
    numericValue !== null
  ) {
    const { value: max, message } = unpack(validator.max, DEFAULT_MAX_MESSAGE);
    if (numericValue > max) {
      return message;
    }
  }

  if (fitsTextualRules(kind, inputType) && typeof value === "string") {
    if (validator.minLength !== undefined) {
      const { value: minLength, message } = unpack(
        validator.minLength,
        DEFAULT_MIN_LENGTH_MESSAGE,
      );
      if (value.length < minLength) {
        return message;
      }
    }

    if (validator.maxLength !== undefined) {
      const { value: maxLength, message } = unpack(
        validator.maxLength,
        DEFAULT_MAX_LENGTH_MESSAGE,
      );
      if (value.length > maxLength) {
        return message;
      }
    }

    // Fixed precedence: email sits after maxLength and before regex.
    if (
      validator.email !== undefined &&
      fitsEmailRule(kind, inputType)
    ) {
      const { value: mustBeEmail, message } = unpack(
        validator.email,
        () => DEFAULT_EMAIL_MESSAGE,
      );
      if (mustBeEmail && !DEFAULT_EMAIL_PATTERN.test(value)) {
        return message;
      }
    }

    if (validator.regex !== undefined) {
      const { value: pattern, message } = unpack(
        validator.regex,
        () => DEFAULT_REGEX_MESSAGE,
      );
      // Fresh RegExp per run so g/y flags can't leak lastIndex between runs.
      const matcher = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
      if (!matcher.test(value)) {
        return message;
      }
    }
  }

  return null;
}

type ControlAttributes = {
  id: string;
  disabled?: boolean;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * The Options popup shared by both choice kinds: a plain disclosure panel
 * with a search box filtering rows above them. Opening moves focus to the
 * search box; every close path (Escape, outside click, focus loss) resets
 * the query via the parent's closePanel. The rows themselves differ per kind.
 */
function OptionsPopup({
  panelId,
  searchId,
  open,
  search,
  onSearchChange,
  searchInputRef,
  children,
}: {
  panelId: string;
  searchId: string;
  open: boolean;
  search: string;
  onSearchChange: (next: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  children: ReactNode;
}) {
  return (
    <div id={panelId} hidden={!open} className={PANEL_CLASS}>
      <label htmlFor={searchId} className="sr-only">
        Search options
      </label>
      <input
        ref={searchInputRef}
        id={searchId}
        type="text"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className={`${CONTROL_CLASS} mt-0`}
      />
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">Options</legend>
        <div className="max-h-60 space-y-1 overflow-y-auto p-0.5">
          {children}
        </div>
      </fieldset>
    </div>
  );
}

/**
 * The shared engine behind the five public Field components: renders exactly
 * one labeled control for the stamped kind and owns the value lifecycle.
 * Not exported — callers pick a wrapper (InputField, SelectField, …), which
 * fixes the kind.
 */
function Field<K extends FieldKind = "input", T = unknown>({
  config,
  ref,
}: {
  config: FieldConfig<K, T>;
  ref?: Ref<FieldHandle<FieldValueOf<K, T>>>;
}) {
  const {
    kind = "input",
    inputType = "text",
    label,
    initialValue,
    validator,
    options = [],
    placeholder,
    keepDisabledSelection = true,
    selectionDisplay = "text",
    hint,
    disabled,
    className,
  } = config;

  // Matching: the configured override or Object.is reference identity,
  // applied at every decision point below.
  const matches = (config.matchValue ?? IDENTITY_MATCH) as MatchFn;

  const baseId = useId();
  const controlId = `${baseId}-control`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const labelId = `${baseId}-label`;
  const panelId = `${baseId}-panel`;
  const searchId = `${baseId}-search`;

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The Field owns its value: the Initial value seeds it exactly once at
  // mount; afterwards every change flows through commitValue below. The
  // internal value is unbounded — choice kinds carry whatever their Options
  // carry — so it is held as unknown and only the types narrow it.
  const [value, setValueState] = useState<unknown>(initialValue);
  const valueRef = useRef<unknown>(initialValue);

  /**
   * Seed-once guard: the Initial prop is compared against the last seen one
   * under the config's own Matching rule.
   */
  const lastInitialRef = useRef(initialValue);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    if (sameInitial(lastInitialRef.current, initialValue, matches)) {
      return;
    }
    lastInitialRef.current = initialValue;
    console.warn(
      `[Field] initialValue of "${label}" changed after mount. A Field seeds its value once at mount; the new Initial value is ignored.`,
    );
  }, [initialValue, label, matches]);

  // Multi-select popup state: disclosure visibility plus the client-side
  // search query; the query resets whenever the panel closes.
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  // Set while a row press is being absorbed: its dissolved focus must not
  // read as leaving the widget (see handleWidgetBlur).
  const absorbedPressRef = useRef(false);
  // Whichever control opens the popup: the multi-select's chevron button or
  // the select's closed face. Escape and focus hops return here.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const chipRemoveRefs = useRef(new Map<string, HTMLButtonElement>());

  // Async Option load lifecycle (loader-form configs only): Pending until the
  // mount-fired loader settles, then Resolved with the Options or Rejected.
  const optionsIsLoader = isOptionsLoader(options);
  const [loadedOptions, setLoadedOptions] = useState<FieldOption[]>([]);
  const [loadStatus, setLoadStatus] = useState<OptionLoadStatus>("pending");

  // validate()/getValue()/setValue() run against the latest committed config,
  // Touched state, and value.
  const configRef = useRef(config);
  const touchedRef = useRef(touched);
  useEffect(() => {
    configRef.current = config;
    touchedRef.current = touched;
    valueRef.current = value;
  });

  /**
   * One honest pipeline for every committed change, however caused — user
   * edit or setValue: install the value internally, notify the observer, and
   * re-evaluate the Error when Touched. The observer's narrowed parameter is
   * widened here once: only kind-appropriate values ever reach this pipeline.
   */
  const commitValue = useCallback((next: unknown) => {
    valueRef.current = next;
    setValueState(next);
    (
      configRef.current.onValueChange as ((value: unknown) => void) | undefined
    )?.(next);
    if (touchedRef.current) {
      setError(
        evaluate(kind, inputType, configRef.current.validator, next),
      );
    }
  }, [kind, inputType]);

  // Retry always re-fires the newest loader the parent passed.
  const loaderRef = useRef(options);
  useEffect(() => {
    loaderRef.current = options;
  });

  // A newer load supersedes an older in-flight one (Retry while still loading).
  const loadTicketRef = useRef(0);

  const runOptionLoad = useCallback(() => {
    if (!isOptionsLoader(loaderRef.current)) {
      return;
    }
    const ticket = ++loadTicketRef.current;
    setLoadStatus("pending");
    loaderRef.current().then(
      (resolved) => {
        if (ticket === loadTicketRef.current) {
          setLoadedOptions(resolved);
          setLoadStatus("resolved");
        }
      },
      () => {
        if (ticket === loadTicketRef.current) {
          setLoadStatus("rejected");
        }
      },
    );
  }, []);

  // The loader fires exactly once on mount; only Retry re-fires it afterwards.
  // The started guard keeps StrictMode's dev double-invoke honest too.
  const mountLoadStartedRef = useRef(false);
  useEffect(() => {
    if (!isOptionsLoader(loaderRef.current) || mountLoadStartedRef.current) {
      return;
    }
    mountLoadStartedRef.current = true;
    runOptionLoad();
  }, [runOptionLoad]);

  useImperativeHandle(
    ref,
    () => ({
      validate: () => {
        const message = evaluate(
          kind,
          inputType,
          configRef.current.validator,
          valueRef.current,
        );
        setTouched(true);
        setError(message);
        return message === null;
      },
      getValue: () => valueRef.current as FieldValueOf<K, T> | undefined,
      setValue: commitValue,
    }),
    [commitValue, kind, inputType],
  );

  // Dev-only: name any rule configured on a kind it does not fit, whenever the
  // Validator or kind changes.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !validator) {
      return;
    }
    for (const name of RULE_NAMES) {
      if (validator[name] !== undefined && !ruleFits(kind, inputType, name)) {
        const target =
          kind === "input" ? `input (${inputType ?? "text"})` : kind;
        console.warn(
          `[Field] Rule "${name}" does not apply to ${target} "${label}" and will be ignored.`,
        );
      }
    }
  }, [validator, kind, inputType, label]);

  // Select closed-face resolution: the held value Matched against Options,
  // with the stale flag driving the dev-only warn. Under a loader, Options
  // only become authoritative once a load has resolved.
  const optionsAuthoritative = !optionsIsLoader || loadStatus === "resolved";
  const selectOptions: FieldOption[] = optionsIsLoader
    ? loadedOptions
    : options;
  const { face, isStale } = resolveSelectFace(
    selectOptions,
    kind === "select" ? value : undefined,
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );

  // The description is computed during render so the effect's dependencies
  // stay primitive — it re-fires only when the unmatched value changes.
  const staleDescription =
    isStale && face.kind === "fallback"
      ? describedStaleValue(face.value)
      : null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && staleDescription !== null) {
      console.warn(
        `[Field] Value ${staleDescription} of select "${label}" does not match any Option and is shown as a fallback.`,
      );
    }
  }, [staleDescription, label]);

  // Multi-select resolution: Chips in Options order plus fallback Chips for
  // values Matching nothing; the joined descriptions keep the dev-warn
  // effect stable.
  const selectedValues: unknown[] =
    kind === "multi-select" && Array.isArray(value) ? value : [];
  const { entries: chips, staleValues } = resolveChips(
    selectOptions,
    selectedValues,
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );
  const staleDescriptions = staleValues.map(describedStaleValue).join('", "');
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && staleDescriptions !== "") {
      console.warn(
        `[Field] Value(s) ${staleDescriptions} of multi-select "${label}" do not match any Option and are shown as fallbacks.`,
      );
    }
  }, [staleDescriptions, label]);

  // Closed-face pieces shared by both Selection displays: the ghost while
  // empty, and the comma-joined label string for the text display (matched
  // Options in Options order, then Fallback labels).
  const emptySelectionFace =
    chips.length === 0 && placeholder ? (
      <span aria-hidden="true" className={SELECT_FACE_GHOST_CLASS}>
        {placeholder}
      </span>
    ) : null;
  const joinedSelection = chips.map((chip) => chip.label).join(", ");

  const rule = validator?.required;
  const isRequired = rule !== undefined && requiredConstraint(rule).isRequired;

  const requiredMarker = isRequired && (
    <>
      {" "}
      <span aria-hidden="true" className="text-red-600 dark:text-red-400">
        *
      </span>{" "}
      <span className="sr-only">(required)</span>
    </>
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const next =
      kind === "checkbox"
        ? // Only a checkbox input renders this branch, so the target carries checked.
          (event.target as HTMLInputElement).checked
        : isNumberInput(kind, inputType)
          ? coerceNumberInput(event.target.value)
          : event.target.value;
    commitValue(next);
  };

  const handleBlur = () => {
    // Evaluate the committed (already coerced) value, never the raw event string.
    setTouched(true);
    setError(evaluate(kind, inputType, config.validator, value));
  };

  const toggleOption = (option: FieldOption) => {
    // In-panel toggles announce nothing extra — clear any pending removal
    // message so a repeated removal re-announces with fresh text.
    setAnnouncement(null);
    const kept = selectedValues.filter(
      (value) => !matches(option.value, value),
    );
    commitValue(
      kept.length === selectedValues.length
        ? [...selectedValues, option.value]
        : kept,
    );
  };

  const removeChip = (chip: Chip, index: number) => {
    const next = selectedValues.filter((value) => !matches(chip.value, value));
    commitValue(next);

    // Closed-face removals announce through the shared always-mounted polite
    // region; last message wins. In-panel toggles never reach this path.
    setAnnouncement(`Removed ${chip.label}. ${next.length} selected.`);

    // Focus hop over the post-removal chip list so focus never rests on a
    // removed node: the chip that took its slot, the last chip, or the open button.
    const { entries: remaining } = resolveChips(
      selectOptions,
      next,
      matches,
      keepDisabledSelection,
      optionsAuthoritative,
    );
    if (remaining.length === 0) {
      triggerRef.current?.focus();
      return;
    }
    const hopChip = remaining[Math.min(index, remaining.length - 1)];
    chipRemoveRefs.current.get(hopChip.key)?.focus();
  };

  // Every close path funnels here: the panel hides and the search query
  // resets so reopening starts unfiltered.
  const closePanel = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  /** Single-choice pick: commit, close the popup, hand focus back to the trigger. */
  const pickOption = (option: FieldOption) => {
    if (option.disabled) {
      return;
    }
    commitValue(option.value);
    closePanel();
    triggerRef.current?.focus();
  };

  // Escape anywhere in the widget closes the popup and returns focus to
  // whichever trigger opened it.
  const handleWidgetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open && event.key === "Escape") {
      closePanel();
      triggerRef.current?.focus();
    }
  };

  // Pointer-down outside the widget closes the panel without moving focus.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent | Event) => {
      const target = event.target;
      if (target instanceof Node && widgetRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePanel, open]);

  const toggleOpen = () => {
    // The popup only ever opens once options are resolved — Pending and
    // Rejected refuse outright, independent of the disabled open button.
    if (!open && optionsLoadBlocked) {
      return;
    }
    if (open) {
      closePanel();
    } else {
      setOpen(true);
    }
  };

  // Focus leaving the whole widget (Tab-out or otherwise) closes the panel
  // naturally — no trap — and counts as leaving the field for the Touched
  // lifecycle. Internal focus moves are ignored. One null-relatedTarget blur
  // is exempt: a row press absorbed its own mousedown, so focus dissolves
  // before the click can reach the checkbox — closing there would unmount
  // the panel and eat the toggle.
  const handleWidgetBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && widgetRef.current?.contains(next)) {
      return;
    }
    if (open && next === null && absorbedPressRef.current) {
      absorbedPressRef.current = false;
      return;
    }
    if (open) {
      closePanel();
    }
    setTouched(true);
    setError(evaluate(kind, inputType, config.validator, value));
  };

  // Opening moves DOM focus to the search input.
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  // The search filters resolved Options client-side; filtered rows leave the
  // accessibility tree because they are not rendered at all. Rows carry their
  // position in the full Options list as a stable key — unbounded values
  // cannot key React trees themselves.
  const query = search.trim().toLowerCase();
  const panelRows = selectOptions
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.label.toLowerCase().includes(query));

  // Pending/Rejected block choosing on choice kinds; the parent's own
  // disabled flag still applies independently.
  const optionsLoadBlocked =
    optionsIsLoader && loadStatus !== "resolved";
  const multiDisabled = disabled || optionsLoadBlocked;

  const controlProps: ControlAttributes = {
    id: controlId,
    disabled: disabled || (kind === "select" && optionsLoadBlocked) || undefined,
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${hintId} ${errorId}`,
  };

  // NaN and seeded-nothing display as Empty; React would otherwise stringify
  // them into the control. Checkboxes render `checked` instead, so booleans
  // never reach this value — and nothing else an unbounded value could be
  // (objects, arrays) belongs in a textual control.
  const displayValue: string | number =
    typeof value === "number"
      ? isNumberInput(kind, inputType) && Number.isNaN(value)
        ? ""
        : value
      : typeof value === "string"
        ? value
        : "";

  // The composite multi-select has no single native control to host failure
  // state, so the named closed-face group anchors it. Spread deliberately:
  // jsx-a11y's role map has no entry for these on `group`, but the DOM/a11y
  // contract requires aria-invalid while failing and wired aria-required.
  const groupStatusAttributes = {
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
  };

  return (
    <div className={className}>
      {kind === "multi-select" ? (
        <>
          {/* The visible label names the closed-face group via aria-labelledby — never content-computed. */}
          <label id={labelId} className={LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>

          <div
            ref={widgetRef}
            className="relative mt-1.5"
            onBlur={handleWidgetBlur}
            onKeyDown={handleWidgetKeyDown}
          >
            <div
              role="group"
              id={controlId}
              aria-labelledby={labelId}
              aria-describedby={`${hintId} ${errorId}`}
              {...groupStatusAttributes}
              className="flex items-stretch gap-1.5"
            >
              {selectionDisplay === "chips" ? (
                <div className={CHIP_STRIP_CLASS}>
                  {emptySelectionFace}
                  {chips.map((chip, index) => (
                    <span key={chip.key} className={CHIP_CLASS}>
                      <span className="max-w-40 truncate">{chip.label}</span>
                      <button
                        type="button"
                        ref={(element) => {
                          if (element) {
                            chipRemoveRefs.current.set(chip.key, element);
                          } else {
                            chipRemoveRefs.current.delete(chip.key);
                          }
                        }}
                        aria-label={`Remove ${chip.label}`}
                        disabled={multiDisabled || undefined}
                        onClick={() => removeChip(chip, index)}
                        className={CHIP_REMOVE_CLASS}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="size-3"
                        >
                          <path
                            d="M3 3l6 6M9 3l-6 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className={SELECTION_TEXT_STRIP_CLASS}>
                  {chips.length === 0 ? (
                    emptySelectionFace
                  ) : (
                    <span
                      className={SELECTION_TEXT_CLASS}
                      title={joinedSelection}
                    >
                      {joinedSelection}
                    </span>
                  )}
                </div>
              )}
              <button
                type="button"
                ref={triggerRef}
                onClick={toggleOpen}
                disabled={multiDisabled || undefined}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label="Show options"
                className={OPEN_BUTTON_CLASS}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="size-4"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Plain disclosure popup: no dialog/listbox role, no focus trap. */}
            <OptionsPopup
              panelId={panelId}
              searchId={searchId}
              open={open}
              search={search}
              onSearchChange={setSearch}
              searchInputRef={searchRef}
            >
              {panelRows.map(({ option, index }) => (
                <label
                  key={index}
                  className={
                    ROW_LABEL_CLASS +
                    (option.disabled
                      ? ROW_LABEL_DISABLED_CLASS
                      : ROW_LABEL_ENABLED_CLASS)
                  }
                  // Absorb the press: a row is not focusable, so letting the
                  // mousedown through would dissolve the search input's
                  // focus mid-press instead of landing it on the checkbox.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    absorbedPressRef.current = true;
                  }}
                >
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={selectedValues.some((value) =>
                      matches(option.value, value),
                    )}
                    disabled={
                      option.disabled || multiDisabled || undefined
                    }
                    onChange={() => toggleOption(option)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </OptionsPopup>
          </div>
        </>
      ) : kind === "select" ? (
        <>
          <label htmlFor={controlId} className={LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>

          <div
            ref={widgetRef}
            className="relative mt-1.5"
            onBlur={handleWidgetBlur}
            onKeyDown={handleWidgetKeyDown}
          >
            {/* Closed face: the ghost while empty, otherwise the selected Option's label. */}
            <button
              {...controlProps}
              type="button"
              ref={triggerRef}
              onClick={toggleOpen}
              aria-expanded={open}
              aria-controls={panelId}
              className={SELECT_TRIGGER_CLASS}
            >
              <span
                className={
                  face.kind === "ghost" ? SELECT_FACE_GHOST_CLASS : undefined
                }
              >
                {face.kind === "ghost"
                  ? placeholder
                  : face.kind === "option"
                    ? face.option.label
                    : face.label}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* The same plain-disclosure popup the multi-select opens. */}
            <OptionsPopup
              panelId={panelId}
              searchId={searchId}
              open={open}
              search={search}
              onSearchChange={setSearch}
              searchInputRef={searchRef}
            >
              {panelRows.map(({ option, index }) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => pickOption(option)}
                  disabled={option.disabled || undefined}
                  className={ROW_BUTTON_CLASS}
                >
                  {option.label}
                </button>
              ))}
            </OptionsPopup>
          </div>
        </>
      ) : kind === "checkbox" ? (
        <div className={CHECKBOX_ROW_CLASS}>
          <input
            {...controlProps}
            type="checkbox"
            checked={value === true}
            onChange={handleChange}
            onBlur={handleBlur}
            className={CHECKBOX_CLASS}
          />
          <label htmlFor={controlId} className={CHECKBOX_LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>
        </div>
      ) : (
        <>
          <label htmlFor={controlId} className={LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>

          {kind === "input" ? (
            <input
              {...controlProps}
              type={inputType}
              value={displayValue}
              placeholder={placeholder}
              onChange={handleChange}
              onBlur={handleBlur}
              className={CONTROL_CLASS}
            />
          ) : (
            <textarea
              {...controlProps}
              value={displayValue}
              placeholder={placeholder}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={4}
              className={`${CONTROL_CLASS} resize-y`}
            />
          )}
        </>
      )}

      {/* Persistent hint slot: Pending/Rejected status lines swap in without unmounting the node. */}
      <p id={hintId} className={HINT_CLASS}>
        {(kind === "select" || kind === "multi-select") &&
        optionsLoadBlocked ? (
          loadStatus === "pending" ? (
            <span className="flex items-center gap-1.5">
              {OPTION_LOAD_SPINNER}
              Loading options…
            </span>
          ) : (
            <>
              <span className={REJECTED_MESSAGE_CLASS}>
                {"Couldn't load options."}
              </span>
              <button
                type="button"
                onClick={runOptionLoad}
                className={RETRY_BUTTON_CLASS}
              >
                Retry
              </button>
            </>
          )
        ) : (
          hint
        )}
      </p>
      <p id={errorId} aria-live="polite" className={ERROR_CLASS}>
        {error && (
          <>
            <span className="sr-only">Error:</span>
            {error}
          </>
        )}
        {/* Multi-select closed-face removal announcements share this polite region, visually hidden. */}
        {announcement && (
          <span className="sr-only">{announcement}</span>
        )}
      </p>
    </div>
  );
}

/**
 * The config for an InputField: value shape fixed at `string | number`,
 * plus the Input type and the native placeholder attribute.
 */
export type FieldInputConfig = FieldCommonConfig<string | number> &
  FieldPlaceholderConfig & {
    inputType?: FieldInputType;
  };

/** The config for a TextareaField: value shape fixed at `string`. */
export type FieldTextareaConfig = FieldCommonConfig<string> &
  FieldPlaceholderConfig;

/** The config for a CheckboxField: value shape fixed at `boolean`. */
export type FieldCheckboxConfig = FieldCommonConfig<boolean>;

/**
 * The config for a SelectField: `initialValue`, `onValueChange`, Options,
 * and `matchValue` narrow to T, the Option value type.
 */
export type FieldSelectConfig<T = unknown> = FieldCommonConfig<T> &
  FieldChoiceConfig<T> &
  FieldPlaceholderConfig;

/**
 * The config for a MultiSelectField: `initialValue`, `onValueChange`,
 * Options, and `matchValue` narrow to T, the Option value type; the Field
 * holds a `T[]`. `selectionDisplay` chooses how the selection renders inside
 * the control — `chips` or `text`, defaulting to `text`.
 */
export type FieldMultiSelectConfig<T = unknown> = FieldCommonConfig<T[]> &
  FieldChoiceConfig<T> &
  FieldPlaceholderConfig & {
    /** Applied live per render like the other presentation props. */
    selectionDisplay?: FieldSelectionDisplay;
  };

/** An input Field: one labeled single-line control, narrowed by Input type. */
export function InputField({
  config,
  ref,
}: {
  config: FieldInputConfig;
  ref?: Ref<FieldHandle<string | number>>;
}) {
  return <Field config={{ ...config, kind: "input" }} ref={ref} />;
}

/** A textarea Field: one labeled multi-line text control. */
export function TextareaField({
  config,
  ref,
}: {
  config: FieldTextareaConfig;
  ref?: Ref<FieldHandle<string>>;
}) {
  return <Field config={{ ...config, kind: "textarea" }} ref={ref} />;
}

/** A checkbox Field: one labeled tick box (required = must-tick). */
export function CheckboxField({
  config,
  ref,
}: {
  config: FieldCheckboxConfig;
  ref?: Ref<FieldHandle<boolean>>;
}) {
  return <Field config={{ ...config, kind: "checkbox" }} ref={ref} />;
}

/** A select Field: single choice from searchable Options in a disclosure. */
export function SelectField<T>({
  config,
  ref,
}: {
  config: FieldSelectConfig<T>;
  ref?: Ref<FieldHandle<T>>;
}) {
  return <Field<"select", T> config={{ ...config, kind: "select" }} ref={ref} />;
}

/**
 * A multi-select Field: multiple choice from searchable Options. The
 * Selection display picks the closed face — a comma-joined text line by
 * default, or removable Chips via `selectionDisplay: "chips"`.
 */
export function MultiSelectField<T>({
  config,
  ref,
}: {
  config: FieldMultiSelectConfig<T>;
  ref?: Ref<FieldHandle<T[]>>;
}) {
  return (
    <Field<"multi-select", T>
      config={{ ...config, kind: "multi-select" }}
      ref={ref}
    />
  );
}
